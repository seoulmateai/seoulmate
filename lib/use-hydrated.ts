import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** 서버 렌더·하이드레이션 중엔 false, 이후 true. 시간대에 따라 달라지는 값 표시용 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
