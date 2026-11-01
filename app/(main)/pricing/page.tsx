import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SubscribeButton } from "@/components/billing/subscribe-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { isBillingEnabled, isStripeLiveMode } from "@/lib/billing/config";
import { getPlanPrice } from "@/lib/billing/price";
import { getSubscription, isEntitled } from "@/lib/billing/subscription";
import { freeDailyLimit, paidDailyLimit } from "@/lib/chat/server";
import { captureServerEvent } from "@/lib/posthog/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plans · seoulmate" };

const CARD_CLASS = "flex flex-col rounded-[20px] border bg-white p-6 md:p-7";

// 결제가 꺼진 환경(Production)에서는 없는 페이지
export default function PricingPage() {
  if (!isBillingEnabled()) notFound();

  return (
    <div className="page-container flex flex-1 flex-col pt-8 pb-6 md:pt-10 min-[850px]:pt-14">
      <section className="mb-7 md:mb-9">
        <p className="mb-2.5 text-[11px] font-extrabold tracking-[2px] text-coral">PLANS</p>
        <h1 className="mb-2 text-[32px] leading-[1.15] font-bold tracking-[-1.5px] md:text-[38px]">
          Talk more every day
        </h1>
        <p className="text-xs text-muted-foreground md:text-sm">
          Daily limits reset at midnight (Korea time).
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <section className={cn(CARD_CLASS, "border-[#e9e9ec]")}>
          <h2 className="mb-1 text-[15px] font-bold">Free</h2>
          <p className="mb-5 text-[28px] font-bold tracking-[-1px]">₩0</p>
          <ul className="mb-6 flex flex-1 flex-col gap-2.5 text-sm">
            <Feature>{freeDailyLimit()} replies a day</Feature>
            <Feature>Chat with every character</Feature>
          </ul>
        </section>

        <section className={cn(CARD_CLASS, "border-[#ffb4b0] bg-[#fffafa]")}>
          <h2 className="mb-1 text-[15px] font-bold text-coral-dark">Subscription</h2>
          <Suspense fallback={<div className="mb-5 h-[42px] w-32 animate-pulse rounded-md bg-coral-soft" />}>
            <PlanPrice />
          </Suspense>
          <ul className="mb-6 flex flex-1 flex-col gap-2.5 text-sm">
            <Feature>{paidDailyLimit()} replies a day</Feature>
            <Feature>Chat with every character</Feature>
            <Feature>Cancel anytime</Feature>
          </ul>
          <Suspense fallback={<div className="h-12 animate-pulse rounded-[11px] bg-coral-soft" />}>
            <PlanAction />
          </Suspense>
        </section>
      </div>

      {!isStripeLiveMode() && (
        <p className="mt-5 text-[11px] leading-relaxed text-[#a0a0a6]">
          Test mode: no real payment is made. Use card 4242 4242 4242 4242.
        </p>
      )}

      <SiteFooter className="mt-12 md:mt-16" />
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-4 shrink-0 text-coral" strokeWidth={2.5} />
      {children}
    </li>
  );
}

async function PlanPrice() {
  const price = await getPlanPrice().catch((e) => {
    console.error("[pricing] fetching price failed", e);
    return null;
  });
  if (!price) return <p className="mb-5 text-[28px] font-bold tracking-[-1px]">—</p>;

  return (
    <p className="mb-5 text-[28px] font-bold tracking-[-1px]">
      {price.amount}
      {price.interval && (
        <span className="ml-1 text-sm font-medium tracking-normal text-muted-foreground">
          / {price.interval}
        </span>
      )}
    </p>
  );
}

// 사용자별: 구독 중이면 구독 관리로, 아니면 구독 버튼 (비로그인도 버튼 → 누르면 로그인으로)
async function PlanAction() {
  const session = await getSession();
  const userId = session?.profile ? session.user.id : null;
  const subscribed = userId ? isEntitled(await getSubscription(userId)) : false;

  if (session) captureServerEvent(session.user.id, "pricing_viewed", { subscribed });

  if (subscribed) {
    return (
      <Link
        href="/settings"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "h-12 w-full rounded-[11px] text-sm font-semibold",
        )}
      >
        You&apos;re subscribed · Manage
      </Link>
    );
  }
  return <SubscribeButton />;
}
