"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 결제 직후 webhook 반영을 기다리며 서버 컴포넌트를 주기적으로 다시 불러온다 */
export function RefreshPoller({ intervalMs = 3000, maxTries = 10 }: { intervalMs?: number; maxTries?: number }) {
  const router = useRouter();

  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= maxTries) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, maxTries]);

  return null;
}
