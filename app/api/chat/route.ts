import { NextResponse } from "next/server";
import { z } from "zod";

import { getCharacterPersona } from "@/lib/characters";
import { MAX_INPUT_LENGTH } from "@/lib/chat/constants";
import { freeDailyLimit, getOrCreateRoomId } from "@/lib/chat/server";
import { MESSAGE_COLUMNS, type ChatApiResponse, type ChatMessage } from "@/lib/chat/types";
import { CONTEXT_MESSAGE_COUNT, generateReply, geminiModel } from "@/lib/gemini/reply";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const bodySchema = z.object({
  characterId: z.string(),
  content: z.string().trim().min(1).max(MAX_INPUT_LENGTH),
});

function json(body: ChatApiResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  // 1. 세션 · 온보딩 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  const character = parsed.success ? await getCharacterPersona(parsed.data.characterId) : null;
  if (!parsed.success || !character) return json({ ok: false, error: "INVALID_REQUEST" }, 400);
  const { content } = parsed.data;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return json({ ok: false, error: "ONBOARDING_REQUIRED" }, 403);

  const admin = createAdminClient();
  const roomId = await getOrCreateRoomId(user.id, character);
  // 비활성 캐릭터 + 기존 대화방 없음
  if (roomId == null) return json({ ok: false, error: "INVALID_REQUEST" }, 400);

  // 2. 일일 사용량 (확인 + 증가를 DB에서 원자적으로). 구독은 아직 없음 → 모두 무료 한도
  const limit = freeDailyLimit();
  const { data: used, error: quotaError } = await admin.rpc("consume_reply_quota", {
    p_user_id: user.id,
    p_limit: limit,
  });
  if (quotaError) {
    console.error("[chat] consume_reply_quota failed", quotaError);
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
  if (used == null) {
    return json({ ok: false, error: "LIMIT_REACHED", usage: { used: limit, limit } }, 429);
  }
  const usage = { used, limit };
  const refund = () => admin.rpc("refund_reply_quota", { p_user_id: user.id });

  // 3. 캐릭터 프롬프트 + 최근 메시지로 Gemini 호출
  const { data: recent, error: historyError } = await admin
    .from("messages")
    .select("role, content")
    .eq("room_id", roomId)
    .order("id", { ascending: false })
    .limit(CONTEXT_MESSAGE_COUNT);
  if (historyError) {
    await refund();
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }

  const turnId = crypto.randomUUID();
  const startedAt = Date.now();
  const reply = await generateReply({
    character,
    nickname: profile.nickname,
    history: recent.reverse().map((m) => ({
      role: m.role === "USER" ? "USER" : "ASSISTANT",
      content: m.content,
    })),
    userMessage: content,
  });

  const logCall = (status: string, extra: Record<string, unknown> = {}) =>
    admin
      .from("llm_calls")
      .insert({
        user_id: user.id,
        room_id: roomId,
        turn_id: turnId,
        purpose: "REPLY",
        model: geminiModel(),
        character_id: character.id,
        persona_version: character.personaVersion,
        latency_ms: Date.now() - startedAt,
        status,
        ...extra,
      })
      .then(({ error }) => error && console.error("[chat] llm_calls insert failed", error));

  if (reply.status !== "SUCCESS") {
    await Promise.all([refund(), logCall(reply.status, { error_code: reply.errorCode })]);
    const usageAfterRefund = { used: used - 1, limit };
    return reply.status === "BLOCKED"
      ? json({ ok: false, error: "BLOCKED", usage: usageAfterRefund }, 422)
      : json({ ok: false, error: "LLM_FAILED", usage: usageAfterRefund }, 502);
  }

  // 4. user/assistant 메시지 저장 (한 문장으로 같이 저장 → 실패 시 둘 다 없음)
  //    chat_rooms.last_message_* 는 DB 트리거가 갱신
  const { data: saved, error: saveError } = await admin
    .from("messages")
    .insert([
      { room_id: roomId, turn_id: turnId, role: "USER", content },
      ...reply.bubbles.map((bubble) => ({
        room_id: roomId,
        turn_id: turnId,
        role: "ASSISTANT",
        content: bubble,
      })),
    ])
    .select(MESSAGE_COLUMNS)
    .order("id");

  await logCall("SUCCESS", {
    input_tokens: reply.usage.input,
    cached_input_tokens: reply.usage.cachedInput,
    output_tokens: reply.usage.output,
  });

  if (saveError) {
    console.error("[chat] messages insert failed", saveError);
    await refund();
    return json({ ok: false, error: "SERVER_ERROR", usage: { used: used - 1, limit } }, 500);
  }

  return json({ ok: true, messages: saved as ChatMessage[], usage }, 200);
}
