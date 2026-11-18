"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { RubyPack } from "@/lib/billing/pricing";

/** POST /api/billing/checkout → Polar 결제 페이지로 이동 */
export function BuyPackButton({ pack, label }: { pack: RubyPack; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pack }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as
      | { ok: true; url: string }
      | { ok: false; error: string }
      | null;

    if (body?.ok) {
      // 결제 페이지로 이동하는 동안 버튼은 계속 로딩 상태
      window.location.href = body.url;
      return;
    }
    setPending(false);
    if (body?.error === "UNAUTHENTICATED") return router.push("/login?next=/shop");
    if (body?.error === "ONBOARDING_REQUIRED") return router.push("/onboarding?next=/shop");
    setError("Couldn't open checkout. Please try again.");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button size="lg" className="h-11 w-full font-bold" disabled={pending} onClick={buy}>
        {pending && <Loader2 className="animate-spin" />}
        {label}
      </Button>
      {error && (
        <p role="alert" className="text-center text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
