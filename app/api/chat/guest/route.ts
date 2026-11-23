import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCharacterPersona, getFirstMeeting } from "@/lib/characters";
import { MAX_INPUT_LENGTH } from "@/lib/chat/constants";
import {
  GUEST_DAILY_LIMIT,
  GUEST_TURN_MAX_AGE_SECONDS,
  getGuestTurn,
  guestCookieName,
  guestMessages,
  hashRequestIp,
} from "@/lib/chat/guest";
import type { GuestChatApiResponse } from "@/lib/chat/types";
import { geminiModel } from "@/lib/gemini/client";
import { generateReply } from "@/lib/gemini/reply";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 30;

// 로그인 전 체험: 첫 만남 메시지에 대한 사용자 답장 1개 → AI 답장 1개. 텍스트만 (사진 X)
// 저장은 guest_turns에만 (messages·루비·호감도 X). 로그인 후 claim_guest_turn이 채팅방으로 옮긴다.
const bodySchema = z.object({
  characterId: z.string(),
  content: z.string().trim().min(1).max(MAX_INPUT_LENGTH),
});

function json(body: GuestChatApiResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  const character = parsed.success ? await getCharacterPersona(parsed.data.characterId) : null;
  if (!parsed.success || !character?.isActive) return json({ ok: false, error: "INVALID_REQUEST" }, 400);
  const { content } = parsed.data;

  const admin = createAdminClient();
  const cookieName = guestCookieName(character.id);

  // 이 캐릭터와 이미 체험 턴을 썼으면 다음 메시지는 로그인 후
  const existingId = (await cookies()).get(cookieName)?.value;
  try {
    if (existingId && (await getGuestTurn(admin, existingId, character.id))) {
      return json({ ok: false, error: "LOGIN_REQUIRED" }, 403);
    }
  } catch (e) {
    console.error("[chat/guest] getGuestTurn failed", e);
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }

  // IP당 하루 GUEST_DAILY_LIMIT턴 (Gemini 호출 전에 예약 → 동시 요청도 한도를 넘지 못함)
  const { data: turnId, error: reserveError } = await admin.rpc("reserve_guest_turn", {
    p_ip_hash: hashRequestIp(request),
    p_character_id: character.id,
    p_daily_limit: GUEST_DAILY_LIMIT,
  });
  if (reserveError) {
    console.error("[chat/guest] reserve_guest_turn failed", reserveError);
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
  if (!turnId) return json({ ok: false, error: "GUEST_LIMIT" }, 429);

  const releaseReservation = async () => {
    const { error } = await admin.from("guest_turns").delete().eq("id", turnId);
    if (error) console.error("[chat/guest] release reservation failed", error);
  };

  let firstMeeting: string | null;
  try {
    firstMeeting = await getFirstMeeting(character.id);
  } catch (e) {
    console.error("[chat/guest] getFirstMeeting failed", e);
    await releaseReservation();
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }

  const reply = await generateReply({
    character,
    nickname: null,
    memory: null,
    history: firstMeeting ? [{ role: "ASSISTANT", content: firstMeeting, hasImage: false }] : [],
    userMessage: content,
    affection: 0,
  });

  // 실패한 답장은 체험 횟수에 넣지 않는다
  if (reply.status !== "SUCCESS") {
    await releaseReservation();
    return reply.status === "BLOCKED"
      ? json({ ok: false, error: "BLOCKED" }, 422)
      : json({ ok: false, error: "LLM_FAILED" }, 502);
  }

  const { data: saved, error: saveError } = await admin
    .from("guest_turns")
    .update({
      user_content: content,
      assistant_content: reply.content,
      affection_delta: reply.affectionDelta,
      model: geminiModel(),
      persona_version: character.personaVersion,
      input_tokens: reply.usage.input,
      cached_input_tokens: reply.usage.cachedInput,
      output_tokens: reply.usage.output,
      thought_tokens: reply.usage.thoughts,
    })
    .eq("id", turnId)
    .select("created_at")
    .single();
  if (saveError) {
    console.error("[chat/guest] guest_turns update failed", saveError);
    await releaseReservation();
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }

  const messages = guestMessages(
    null,
    { userContent: content, assistantContent: reply.content, createdAt: saved.created_at },
    saved.created_at,
  );
  const response = json({ ok: true, messages }, 200);
  response.cookies.set(cookieName, turnId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_TURN_MAX_AGE_SECONDS,
  });
  return response;
}
