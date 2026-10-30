import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import type { DailyUsage } from "./types";

export function freeDailyLimit() {
  const n = Number(process.env.FREE_DAILY_REPLY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 30;
}

/** 사용량 집계 기준일 (DB 함수와 동일하게 KST) */
export function todayKst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

/** 사용자 × 캐릭터 채팅방 id. 없으면 만든다 (chat_rooms 쓰기는 서버 전용) */
export async function getOrCreateRoomId(userId: string, characterSlug: string) {
  const admin = createAdminClient();
  const { error: upsertError } = await admin
    .from("chat_rooms")
    .upsert(
      { user_id: userId, character_slug: characterSlug },
      { onConflict: "user_id,character_slug", ignoreDuplicates: true },
    );
  if (upsertError) throw upsertError;

  const { data, error } = await admin
    .from("chat_rooms")
    .select("id")
    .eq("user_id", userId)
    .eq("character_slug", characterSlug)
    .single();
  if (error) throw error;
  return data.id;
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
