import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { isBillingEnabled } from "@/lib/billing/config";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Checkout canceled · seoulmate" };

// Stripe Checkout에서 뒤로가기·취소했을 때 돌아오는 화면 (결제되지 않음)
export default function BillingCancelPage() {
  if (!isBillingEnabled()) notFound();

  return (
    <div className="page-container flex flex-1 flex-col items-center justify-center py-12">
      <section className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-bold tracking-[-1px]">Checkout canceled</h1>
        <p className="text-sm text-muted-foreground">
          You haven&apos;t been charged. You can subscribe anytime.
        </p>
        <Link
          href="/pricing"
          className={cn(buttonVariants({ size: "lg" }), "mt-3 h-12 w-full rounded-[11px] text-sm font-semibold")}
        >
          Back to plans
        </Link>
        <Link href="/chats" className="p-2 text-[13px] text-[#888b93] underline-offset-4 hover:underline">
          Continue chatting
        </Link>
      </section>
    </div>
  );
}
