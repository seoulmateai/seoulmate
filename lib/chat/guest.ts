import "server-only";

import { createHash } from "node:crypto";

import type { createAdminClient } from "@/lib/supabase/admin";

import type { ChatMessage } from "./types";

// 로그인 전 게스트 체험: 캐릭터당 한 턴(사용자 메시지 1 + AI 답장 1). 다음 메시지는 로그인 후.
// 게스트 턴은 guest_turns에 저장하고 id를 httpOnly 쿠키(캐릭터별)로 들고 있는다.
// 로그인 후 같은 캐릭터 채팅방을 열면 claimGuestTurn이 채팅방으로 옮긴다.
// 테이블·함수: supabase/migrations/20261123000000_guest_turns.sql

type Admin = ReturnType<typeof createAdminClient>;

/** IP당 하루(KST) 게스트 턴 수 */
export const GUEST_DAILY_LIMIT = 3;
/** 쿠키·DB 모두 이 시간이 지나면 이어가지 않는다 (claim_guest_turn의 1일과 맞춤) */
export const GUEST_TURN_MAX_AGE_SECONDS = 60 * 60 * 24;

export function guestCookieName(characterId: string) {
  return `sm_guest_${characterId.toLowerCase()}`;
}

/** 요청 IP의 해시 (원본 IP는 저장하지 않음). Vercel은 x-forwarded-for 첫 값이 클라이언트 IP */
export function hashRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return createHash("sha256").update(`seoulmate-guest:${ip}`).digest("hex");
}

export type GuestTurn = {
  id: string;
  userContent: string;
  assistantContent: string;
  createdAt: string;
};

/** 아직 채팅방으로 옮기지 않은, 답장까지 끝난 게스트 턴 (없거나 만료·다른 캐릭터면 null) */
export async function getGuestTurn(
  admin: Admin,
  turnId: string,
  characterId: string,
): Promise<GuestTurn | null> {
  if (!/^[0-9a-f-]{36}$/i.test(turnId)) return null;
  const since = new Date(Date.now() - GUEST_TURN_MAX_AGE_SECONDS * 1000).toISOString();
  const { data, error } = await admin
    .from("guest_turns")
    .select("id, user_content, assistant_content, created_at")
    .eq("id", turnId)
    .eq("character_id", characterId.toLowerCase())
    .is("claimed_at", null)
    .not("assistant_content", "is", null)
    .gt("created_at", since)
    .maybeSingle();
  if (error) throw error;
  if (!data?.user_content || !data.assistant_content) return null;
  return {
    id: data.id,
    userContent: data.user_content,
    assistantContent: data.assistant_content,
    createdAt: data.created_at,
  };
}

/** 게스트 턴을 로그인 사용자의 채팅방으로 옮긴다. 반환: 옮겼으면 true (이미 옮겼거나 대상이 아니면 false) */
export async function claimGuestTurn(admin: Admin, turnId: string, userId: string, roomId: number) {
  if (!/^[0-9a-f-]{36}$/i.test(turnId)) return false;
  const { data, error } = await admin.rpc("claim_guest_turn", {
    p_turn_id: turnId,
    p_user_id: userId,
    p_room_id: roomId,
  });
  if (error) throw error;
  return data === true;
}

/**
 * 게스트 화면용 메시지. DB messages 행이 아니므로 id는 음수 (실제 id와 겹치지 않음).
 * firstMeeting(-3) → 사용자(-2) → 답장(-1) 순서
 */
export function guestMessages(
  firstMeeting: string | null,
  turn: { userContent: string; assistantContent: string; createdAt: string } | null,
  firstMeetingAt: string,
): ChatMessage[] {
  const base = { image_path: null, image_width: null, image_height: null };
  const messages: ChatMessage[] = [];
  if (firstMeeting) {
    messages.push({
      ...base,
      id: -3,
      turn_id: "guest-first-meeting",
      role: "ASSISTANT",
      content: firstMeeting,
      created_at: turn?.createdAt ?? firstMeetingAt,
    });
  }
  if (turn) {
    messages.push(
      { ...base, id: -2, turn_id: "guest-turn", role: "USER", content: turn.userContent, created_at: turn.createdAt },
      { ...base, id: -1, turn_id: "guest-turn", role: "ASSISTANT", content: turn.assistantContent, created_at: turn.createdAt },
    );
  }
  return messages;
}
