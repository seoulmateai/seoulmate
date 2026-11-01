"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CheckoutResponse =
  | { ok: true; url: string }
  | { ok: false; error: "UNAUTHENTICATED" | "ONBOARDING_REQUIRED" | "ALREADY_SUBSCRIBED" | string };

// Stripe Checkout으로 이동. 로그인·온보딩이 안 됐으면 해당 화면으로 보낸 뒤 /pricing으로 돌아오게 한다
export function SubscribeButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"ALREADY_SUBSCRIBED" | "FAILED" | null>(null);

  async function subscribe() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/stripe/checkout", { method: "POST" }).catch(() => null);
    const body: CheckoutResponse | null = await res?.json().catch(() => null);

    if (body?.ok) {
      // Stripe 결제 페이지로 이동하는 동안 버튼은 계속 로딩 상태
      window.location.href = body.url;
      return;
    }
    setPending(false);
    if (body?.error === "UNAUTHENTICATED") {
      router.push(`/login?next=${encodeURIComponent("/pricing")}`);
    } else if (body?.error === "ONBOARDING_REQUIRED") {
      router.push(`/onboarding?next=${encodeURIComponent("/pricing")}`);
    } else if (body?.error === "ALREADY_SUBSCRIBED") {
      setError("ALREADY_SUBSCRIBED");
      router.refresh();
    } else {
      setError("FAILED");
    }
  }

  return (
    <>
      <Button size="lg" className="h-12 w-full rounded-[11px] text-sm font-semibold" disabled={pending} onClick={subscribe}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Subscribe
      </Button>
      {error === "ALREADY_SUBSCRIBED" && (
        <p role="alert" className="mt-2 text-xs text-muted-foreground">
          You&apos;re already subscribed.{" "}
          <Link href="/settings" className="font-semibold text-coral underline-offset-4 hover:underline">
            Manage subscription
          </Link>
        </p>
      )}
      {error === "FAILED" && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          Couldn&apos;t start checkout. Please try again.
        </p>
      )}
    </>
  );
}
