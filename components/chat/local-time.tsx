"use client";

import { formatListTime } from "@/lib/chat/format";
import { useHydrated } from "@/lib/use-hydrated";

/** 사용자 시간대로 표시하는 채팅 목록 시각 */
export function ListTime({ iso, className }: { iso: string; className?: string }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={iso} className={className}>
      {hydrated ? formatListTime(iso) : ""}
    </time>
  );
}
