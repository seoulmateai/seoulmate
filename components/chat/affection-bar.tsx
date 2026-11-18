"use client";

import { Heart, Loader2, Play } from "lucide-react";

import { MAX_AFFECTION, stageIndex, stageLabel, type RelationshipView } from "@/lib/affection/stages";

// 채팅 영역 위에 떠 있는 글래스 칩: 관계 단계 + 호감도 게이지 (변화량 숫자 없이 게이지만 움직임)
// 진행할 에피소드가 있으면 칩 오른쪽에 "{단계} Episode" 버튼.
// 색은 채팅방 헤더와 같은 테마 토큰(card·border·muted·coral)을 쓰고, 배경만 살짝 비치게 한다.
// 부모는 position: relative 이어야 함 (chat-room.tsx)
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
      <div className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full border border-border bg-card/85 py-1.5 pr-1.5 pl-3 shadow-md backdrop-blur-md">
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
          className="h-1.5 w-20 shrink overflow-hidden rounded-full bg-muted sm:w-28"
        >
          <div
            className="h-full rounded-full bg-coral transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-muted-foreground tabular-nums">
          {affection}/{MAX_AFFECTION}
        </span>
        {nextEpisodeStage != null ? (
          <button
            type="button"
            onClick={() => onStartEpisode(nextEpisodeStage)}
            disabled={disabled || starting}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-coral-soft px-2.5 py-1 text-[11px] font-bold text-coral hover:bg-coral/20 disabled:opacity-50"
          >
            {starting ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <Play className="size-3 fill-current" aria-hidden />
            )}
            {stageLabel(nextEpisodeStage)} Episode
          </button>
        ) : (
          <span className="w-1.5" aria-hidden />
        )}
      </div>
      {error && (
        <p className="pointer-events-auto rounded-full border border-border bg-card/85 px-3 py-1 text-[11px] text-destructive backdrop-blur-md">
          {error}
        </p>
      )}
    </div>
  );
}
