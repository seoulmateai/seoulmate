import { NextResponse } from "next/server";
import { z } from "zod";

import { getCharacterPersona } from "@/lib/characters";
import { MAX_IMAGE_BYTES, MAX_INPUT_LENGTH } from "@/lib/chat/constants";
import { normalizeImage, type NormalizedImage } from "@/lib/chat/image.server";
import { getOrCreateRoomId, getReplyPlan } from "@/lib/chat/server";
import { MESSAGE_COLUMNS, type ChatApiResponse, type ChatMessage } from "@/lib/chat/types";
import { CONTEXT_MESSAGE_COUNT, generateReply, geminiModel } from "@/lib/gemini/reply";
import { captureServerEvent } from "@/lib/posthog/server";
import { deleteChatImage, putChatImage } from "@/lib/r2/chat-images";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

// multipart/form-data: characterId, content, image(선택). 텍스트와 사진 중 하나는 있어야 함
const bodySchema = z
  .object({
    characterId: z.string(),
    content: z.string().trim().max(MAX_INPUT_LENGTH).default(""),
    image: z.instanceof(File).optional(),
  })
  .refine((b) => b.content.length > 0 || b.image);

async function parseBody(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return null;
  const parsed = bodySchema.safeParse({
    characterId: form.get("characterId"),
    content: form.get("content") ?? undefined,
    image: form.get("image") ?? undefined,
  });
  return parsed.success ? parsed.data : null;
}

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

  const body = await parseBody(request);
  const character = body ? await getCharacterPersona(body.characterId) : null;
  if (!body || !character) return json({ ok: false, error: "INVALID_REQUEST" }, 400);
  const { content } = body;

  // 사진은 한도 차감 전에 검증·WebP 변환 (잘못된 파일로 횟수가 줄지 않게)
  let image: NormalizedImage | null = null;
  if (body.image) {
    if (body.image.size > MAX_IMAGE_BYTES) return json({ ok: false, error: "INVALID_IMAGE" }, 413);
    image = await normalizeImage(await body.image.arrayBuffer());
    if (!image) return json({ ok: false, error: "INVALID_IMAGE" }, 400);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return json({ ok: false, error: "ONBOARDING_REQUIRED" }, 403);

  const admin = createAdminClient();
  const [roomId, { limit }] = await Promise.all([
    getOrCreateRoomId(user.id, character),
    getReplyPlan(user.id),
  ]);
  // 비활성 캐릭터 + 기존 대화방 없음
  if (roomId == null) return json({ ok: false, error: "INVALID_REQUEST" }, 400);

  // 2. 일일 사용량 (확인 + 증가를 DB에서 원자적으로). 한도는 구독 여부에 따라 무료/구독자
  const { data: used, error: quotaError } = await admin.rpc("consume_reply_quota", {
    p_user_id: user.id,
    p_limit: limit,
  });
  if (quotaError) {
    console.error("[chat] consume_reply_quota failed", quotaError);
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
  if (used == null) {
    captureServerEvent(user.id, "chat_limit_reached", { character_id: character.id, limit });
    return json({ ok: false, error: "LIMIT_REACHED", usage: { used: limit, limit } }, 429);
  }
  const usage = { used, limit };
  const refund = () => admin.rpc("refund_reply_quota", { p_user_id: user.id });

  // 3. 캐릭터 프롬프트 + 최근 메시지로 Gemini 호출
  const { data: recent, error: historyError } = await admin
    .from("messages")
    .select("role, content, image_path")
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
      hasImage: m.image_path != null,
    })),
    userMessage: content,
    userImage: image?.data,
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
    captureServerEvent(user.id, "chat_reply_failed", {
      character_id: character.id,
      status: reply.status,
      error_code: reply.errorCode,
      has_image: image != null,
    });
    const usageAfterRefund = { used: used - 1, limit };
    return reply.status === "BLOCKED"
      ? json({ ok: false, error: "BLOCKED", usage: usageAfterRefund }, 422)
      : json({ ok: false, error: "LLM_FAILED", usage: usageAfterRefund }, 502);
  }

  // 4. 사진 R2 업로드 (답변 성공 후에만 → 실패한 요청의 사진이 남지 않음)
  let imagePath: string | null = null;
  if (image) {
    try {
      imagePath = await putChatImage(user.id, image.data);
    } catch (e) {
      console.error("[chat] R2 upload failed", e);
      await Promise.all([refund(), logCall("SUCCESS", { error_code: "IMAGE_UPLOAD_FAILED" })]);
      return json({ ok: false, error: "SERVER_ERROR", usage: { used: used - 1, limit } }, 500);
    }
  }

  // 5. user/assistant 메시지 저장 (한 문장으로 같이 저장 → 실패 시 둘 다 없음)
  //    chat_rooms.last_message_* 는 DB 트리거가 갱신
  const { data: saved, error: saveError } = await admin
    .from("messages")
    .insert([
      {
        room_id: roomId,
        turn_id: turnId,
        role: "USER",
        content,
        image_path: imagePath,
        image_width: image?.width,
        image_height: image?.height,
      },
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
    await Promise.all([
      refund(),
      imagePath &&
        deleteChatImage(imagePath).catch((e) => console.error("[chat] R2 cleanup failed", e)),
    ]);
    return json({ ok: false, error: "SERVER_ERROR", usage: { used: used - 1, limit } }, 500);
  }

  captureServerEvent(user.id, "chat_message_sent", {
    character_id: character.id,
    has_image: imagePath != null,
    content_length: content.length,
    bubble_count: reply.bubbles.length,
    latency_ms: Date.now() - startedAt,
    input_tokens: reply.usage.input,
    output_tokens: reply.usage.output,
    used,
    limit,
  });

  return json({ ok: true, messages: saved as ChatMessage[], usage }, 200);
}
