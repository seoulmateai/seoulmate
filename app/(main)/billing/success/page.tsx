import { CircleCheck, Loader2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SubscriptionPoller } from "@/components/billing/subscription-poller";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isBillingEnabled } from "@/lib/billing/config";
import { isActiveSubscriber } from "@/lib/billing/subscription";
import { paidDailyLimit } from "@/lib/chat/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Subscription · seoulmate" };

// Stripe Checkout 결제 후 돌아오는 화면. 구독 반영은 webhook 기준이므로
// 반영 전에는 "처리 중"을 보여주고 SubscriptionPoller가 주기적으로 다시 확인한다.
export default function BillingSuccessPage() {
  if (!isBillingEnabled()) notFound();

  return (
    <div className="page-container flex flex-1 flex-col items-center justify-center py-12">
      <Suspense fallback={<Processing />}>
        <SubscriptionStatus />
      </Suspense>
    </div>
  );
}

async function SubscriptionStatus() {
  const { user } = await requireOnboardedUser("/billing/success");
  if (!(await isActiveSubscriber(user.id))) {
    return (
      <>
        <Processing />
        <SubscriptionPoller />
      </>
    );
  }

  return (
    <section className="flex max-w-sm flex-col items-center gap-3 text-center">
      <CircleCheck className="size-12 text-coral" strokeWidth={1.5} />
      <h1 className="text-2xl font-bold tracking-[-1px]">You&apos;re subscribed!</h1>
      <p className="text-sm text-muted-foreground">
        You can now get up to {paidDailyLimit()} replies a day.
      </p>
      <Link
        href="/chats"
        className={cn(buttonVariants({ size: "lg" }), "mt-3 h-12 w-full rounded-[11px] text-sm font-semibold")}
      >
        Go to chats
      </Link>
    </section>
  );
}

function Processing() {
  return (
    <section className="mb-4 flex max-w-sm flex-col items-center gap-3 text-center">
      <Loader2 className="size-10 animate-spin text-coral" />
      <h1 className="text-2xl font-bold tracking-[-1px]">Setting up your subscription…</h1>
      <p className="text-sm text-muted-foreground">Your payment went through. This only takes a moment.</p>
    </section>
  );
}
