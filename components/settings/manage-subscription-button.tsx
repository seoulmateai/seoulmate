"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

// Stripe Customer Portal(해지·카드 변경)로 이동
export function ManageSubscriptionButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/stripe/portal", { method: "POST" }).catch(() => null);
    const body: { ok: boolean; url?: string } | null = await res?.json().catch(() => null);
    if (!body?.ok || !body.url) {
      setPending(false);
      setError("Couldn't open subscription settings. Please try again.");
      return;
    }
    window.location.href = body.url;
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="h-11 w-full rounded-[11px] border-[#e3e3e6] text-sm font-semibold hover:border-[#ffb4b0] hover:bg-[#fffafa] hover:text-coral md:w-auto md:px-6"
        disabled={pending}
        onClick={openPortal}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Manage subscription
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
