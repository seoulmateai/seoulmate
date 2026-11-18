import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

import type { RoomAffection } from "./stages";

type Admin = ReturnType<typeof createAdminClient>;

/** 호감도 반영 (DB가 0~100, delta -10~10으로 자름). newlyUnlocked = 새 관계 단계에 처음 도달 */
export async function applyAffection(
  admin: Admin,
  roomId: number,
  delta: number,
): Promise<{ room: RoomAffection; newlyUnlocked: boolean }> {
  const { data, error } = await admin
    .rpc("apply_affection", { p_room_id: roomId, p_delta: delta })
    .single();
  if (error) throw error;
  return {
    room: {
      affection: data.affection,
      unlockedStage: data.unlocked_stage,
      playedStage: data.played_stage,
    },
    newlyUnlocked: data.newly_unlocked,
  };
}

/**
 * 에피소드 진행 예약: played_stage를 읽은 값(from) → stage로 조건부 갱신.
 * 동시에 두 번 눌러도 한 요청만 true. LLM·저장이 실패하면 releaseEpisode로 되돌린다.
 */
export async function claimEpisode(admin: Admin, roomId: number, from: number, stage: number) {
  const { data, error } = await admin
    .from("chat_rooms")
    .update({ played_stage: stage })
    .eq("id", roomId)
    .eq("played_stage", from)
    .gte("unlocked_stage", stage)
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

export async function releaseEpisode(admin: Admin, roomId: number, from: number, stage: number) {
  const { error } = await admin
    .from("chat_rooms")
    .update({ played_stage: from })
    .eq("id", roomId)
    .eq("played_stage", stage);
  if (error) console.error("[affection] releaseEpisode failed", error);
}
