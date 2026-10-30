import { format, isSameDay, isSameYear, isToday, isYesterday } from "date-fns";

// 모두 브라우저(사용자 시간대) 기준. 서버 렌더 시간대와 다르므로 useHydrated()와 함께 사용.

/** 채팅 목록: 오늘이면 시각, 어제면 Yesterday, 그 외 날짜 */
export function formatListTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "p");
  if (isYesterday(d)) return "Yesterday";
  if (isSameYear(d, new Date())) return format(d, "MMM d");
  return format(d, "yyyy. M. d.");
}

/** 말풍선 옆 시각 */
export function formatBubbleTime(iso: string) {
  return format(new Date(iso), "p");
}

/** 날짜 구분선 */
export function formatDateDivider(iso: string) {
  return format(new Date(iso), "EEEE, MMMM d, yyyy");
}

export function sameDay(a: string, b: string) {
  return isSameDay(new Date(a), new Date(b));
}

/** 같은 분(minute)에 보낸 메시지인지 — 카톡처럼 프사·시각 묶음 표시용 */
export function sameMinute(a: string, b: string) {
  return Math.floor(Date.parse(a) / 60_000) === Math.floor(Date.parse(b) / 60_000);
}
