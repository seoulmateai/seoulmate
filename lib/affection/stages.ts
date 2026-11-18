// 호감도 → 관계 단계 (서버·클라이언트 공용). 단계별 프롬프트 규칙은 lib/gemini/reply.ts
//
// - 호감도 0~100. 답장마다 AI가 -10~+10으로 판정 (DB 함수 apply_affection이 다시 자름)
// - 단계 i(0~5)는 호감도 i*20 이상. 단계 1~5에 도달하면 characters.episode_{i}가 해금된다
// - chat_rooms.unlocked_stage(도달한 최고 단계)는 내려가지 않음 → 호감도가 떨어졌다 올라도 재해금 없음

export const MAX_AFFECTION = 100;
/** 답장 1회 최대 변화 폭. DB 함수 apply_affection도 같은 값으로 자른다 */
export const MAX_AFFECTION_DELTA = 10;
export const AFFECTION_PER_STAGE = 20;
export const EPISODE_COUNT = 5;

export const STAGE_LABELS = [
  "Stranger",
  "Acquaintance",
  "Confidant",
  "Crush",
  "Lover",
  "Beloved",
] as const;

export type StageLabel = (typeof STAGE_LABELS)[number];

export function clampAffection(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_AFFECTION, Math.max(0, Math.round(value)));
}

/** AI가 준 판정값 → -10~10 정수. 없거나 숫자가 아니면 0 */
export function clampAffectionDelta(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(MAX_AFFECTION_DELTA, Math.max(-MAX_AFFECTION_DELTA, Math.round(value)));
}

/** 0 = Stranger … 5 = Beloved */
export function stageIndex(affection: number) {
  return Math.min(EPISODE_COUNT, Math.floor(clampAffection(affection) / AFFECTION_PER_STAGE));
}

export function stageLabel(stage: number): StageLabel {
  return STAGE_LABELS[Math.min(EPISODE_COUNT, Math.max(0, stage))];
}

/** chat_rooms의 호감도 칼럼 */
export type RoomAffection = { affection: number; unlockedStage: number; playedStage: number };

/**
 * 다음에 진행할 에피소드 단계 (없으면 null).
 * 진행한 단계 다음부터 해금된 단계까지 중 시나리오가 입력된 가장 앞 단계 — 비어 있는 단계는 건너뛴다.
 * @param episodes characters.episode_1 ~ episode_5
 */
export function nextEpisodeStage(
  room: Pick<RoomAffection, "unlockedStage" | "playedStage">,
  episodes: readonly (string | null)[],
): number | null {
  for (let stage = room.playedStage + 1; stage <= Math.min(room.unlockedStage, EPISODE_COUNT); stage++) {
    if (episodes[stage - 1]?.trim()) return stage;
  }
  return null;
}

/** 클라이언트에 보내는 관계 상태 (POST /api/chat 응답, 채팅방 초기값) */
export type RelationshipView = { affection: number; nextEpisodeStage: number | null };

export function toRelationshipView(
  room: RoomAffection,
  episodes: readonly (string | null)[],
): RelationshipView {
  return { affection: room.affection, nextEpisodeStage: nextEpisodeStage(room, episodes) };
}
