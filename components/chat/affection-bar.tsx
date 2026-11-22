"use client";

import { Heart, Play, Sparkles } from "lucide-react";

import { MAX_AFFECTION, stageIndex, stageLabel, type RelationshipView } from "@/lib/affection/stages";

// 채팅 영역 위에 떠 있는 칩 2개
//  1) 호감도 칩: 관계 단계 + 게이지 + 64/100 (변화량 숫자 없이 게이지만 움직임)
//  2) 에피소드 칩 (진행할 에피소드가 있을 때만): 칩 자체가 버튼 → 누르면 바로 에피소드 시작
// 색은 채팅방 헤더와 같은 테마 토큰(card·border·muted·coral)을 쓰고, 배경만 살짝 비치게 한다.
// 부모는 position: relative 이어야 함 (chat-room.tsx)
const CHIP =
  "pointer-events-auto flex w-full max-w-xl items-center rounded-full border border-white/10 bg-[#16121c]/90 shadow-md backdrop-blur-md";

export function AffectionBar({
  relationship,
  starting,
  disabled,
  error,
  onStartEpisode,
}: {
  relationship: RelationshipView;
  /** 에피소드 시작 요청 중 */
  starting: boolean;
  /** 답장 대기·공개 중에는 시작 불가 */
  disabled: boolean;
  error: string | null;
  onStartEpisode: (stage: number) => void;
}) {
  const { affection, nextEpisodeStage } = relationship;
  const label = stageLabel(stageIndex(affection));
  const percent = (affection / MAX_AFFECTION) * 100;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-1.5 px-3.5">
      <div className={`${CHIP} gap-2.5 px-3 py-1.5`}>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-coral">
          <Heart className="size-3.5 fill-current" aria-hidden />
          {label}
        </span>
        <div
          role="meter"
          aria-label={`Affection: ${label}`}
          aria-valuemin={0}
          aria-valuemax={MAX_AFFECTION}
          aria-valuenow={affection}
          className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="btn-gradient h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-muted-foreground tabular-nums">
          {affection}/{MAX_AFFECTION}
        </span>
      </div>

      {/* 누르면 바로 숨김 → 응답의 relationship으로 다음 에피소드 이름이 나오거나 사라진다.
          시작에 실패하면 relationship이 그대로라 같은 버튼이 다시 보인다 */}
      {nextEpisodeStage != null && !starting && (
        <button
          type="button"
          onClick={() => onStartEpisode(nextEpisodeStage)}
          disabled={disabled}
          aria-label={`Start the ${stageLabel(nextEpisodeStage)} episode`}
          className={`${CHIP} max-w-full gap-1.5 px-3 py-1 text-[11px] font-bold text-coral hover:bg-card disabled:opacity-60`}
        >
          <Sparkles className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{stageLabel(nextEpisodeStage)} Episode</span>
          <Play className="size-2.5 shrink-0 fill-current" aria-hidden />
        </button>
      )}

      {error && (
        <p className="pointer-events-auto rounded-full border border-border bg-card/85 px-3 py-1 text-[11px] text-destructive backdrop-blur-md">
          {error}
        </p>
      )}
    </div>
  );
}
