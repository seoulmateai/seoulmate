import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import type { DailyUsage } from "./types";

export function freeDailyLimit() {
  const n = Number(process.env.FREE_DAILY_REPLY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 10;
}

/** 사용량 집계 기준일 (DB 함수와 동일하게 KST) */
export function todayKst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

/**
 * 사용자 × 캐릭터 채팅방 id. 없으면 만든다 (chat_rooms 쓰기는 서버 전용).
 * 비활성 캐릭터는 새 방을 만들지 않고, 기존 방이 없으면 null.
 */
export async function getOrCreateRoomId(
  userId: string,
  character: { id: string; isActive: boolean },
): Promise<number | null> {
  const admin = createAdminClient();
  const findRoomId = async () => {
    const { data, error } = await admin
      .from("chat_rooms")
      .select("id")
      .eq("user_id", userId)
      .eq("character_id", character.id)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  };

  // 대부분은 이미 방이 있으므로 조회 먼저 (DB 왕복 1번)
  const existing = await findRoomId();
  if (existing != null || !character.isActive) return existing;

  const { error: upsertError } = await admin
    .from("chat_rooms")
    .upsert(
      { user_id: userId, character_id: character.id },
      { onConflict: "user_id,character_id", ignoreDuplicates: true },
    );
  if (upsertError) throw upsertError;
  // 동시 요청으로 다른 쪽이 먼저 만들었어도(ignoreDuplicates) 다시 조회하면 id를 얻는다
  return findRoomId();
}

export async function getDailyUsage(userId: string): Promise<DailyUsage> {
  const { data } = await createAdminClient()
    .from("usage_counters")
    .select("reply_count")
    .eq("user_id", userId)
    .eq("usage_date", todayKst())
    .maybeSingle();
  return { used: data?.reply_count ?? 0, limit: freeDailyLimit() };
}
