"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 2000;
const MAX_TRIES = 15;

// 결제 직후 webhook이 구독을 반영할 때까지 서버 컴포넌트를 주기적으로 다시 불러온다.
// 반영되면 부모가 이 컴포넌트 대신 완료 화면을 그리므로 자동으로 멈춘다.
export function SubscriptionPoller() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (tries > MAX_TRIES) {
        clearInterval(id);
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  if (!timedOut) return null;
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      This is taking longer than usual. Your subscription will appear in My Page once it&apos;s
      ready. Refresh this page to check again.
    </p>
  );
}
