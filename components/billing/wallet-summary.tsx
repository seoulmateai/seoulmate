import { Gem } from "lucide-react";
import Link from "next/link";

import type { RubyWallet } from "@/lib/billing/pricing";

/** 루비 잔액 카드 (마이페이지). 높이 고정: 옆의 RubyHistory와 같은 높이 */
export function WalletSummary({ wallet, freeDaily }: { wallet: RubyWallet; freeDaily: number }) {
  return (
    <section className="flex h-[300px] flex-col rounded-[18px] border border-border bg-card p-5 md:p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-coral-soft text-coral">
          <Gem className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground">YOUR RUBIES</p>
          <p className="text-2xl font-extrabold">{wallet.free + wallet.paid}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-muted px-3 py-2.5">
          <dt className="text-muted-foreground">Free today</dt>
          <dd className="mt-0.5 text-base font-bold">
            {wallet.free} <span className="text-[11px] font-normal text-muted-foreground">/ {freeDaily}</span>
          </dd>
        </div>
        <div className="rounded-xl bg-muted px-3 py-2.5">
          <dt className="text-muted-foreground">Purchased</dt>
          <dd className="mt-0.5 text-base font-bold">{wallet.paid}</dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Free rubies refill to {freeDaily} at midnight (Korea time) and don&apos;t carry over. Free
        rubies are used first.
      </p>

      <Link
        href="/shop"
        className="mt-3 flex h-11 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/80"
      >
        Get rubies
      </Link>
    </section>
  );
}
