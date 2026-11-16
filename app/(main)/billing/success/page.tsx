import { Gem } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { RefreshPoller } from "@/components/billing/refresh-poller";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getWallet } from "@/lib/billing/wallet";
import { createAdminClient } from "@/lib/supabase/admin";

// Polar 결제 후 돌아오는 페이지 (?checkout_id=...)
// 루비 지급은 webhook 기준이라 여기서는 잔액만 보여주고, 반영될 때까지 몇 번 새로고침한다
// TODO(7단계): 이번 결제가 반영됐는지 확인해서 "충전 완료"로 바꾸기
export default function BillingSuccessPage() {
  return (
    <div className="page-container flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-coral-soft text-coral">
        <Gem className="size-7" aria-hidden />
      </div>
      <div>
        <h1 className="mb-2 text-2xl font-bold">Thanks for your purchase!</h1>
        <p className="text-sm text-muted-foreground">
          Your rubies will be added in a few seconds.
        </p>
      </div>
      <Suspense fallback={<div className="h-16 w-48 animate-pulse rounded-2xl bg-coral-soft" />}>
        <Balance />
      </Suspense>
      <Link href="/chats" className="text-sm font-bold text-coral hover:underline">
        Back to chats
      </Link>
    </div>
  );
}

async function Balance() {
  const { user } = await requireOnboardedUser("/billing/success");
  const wallet = await getWallet(createAdminClient(), user.id);
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-4">
      <p className="text-[11px] font-bold tracking-wide text-muted-foreground">PURCHASED RUBIES</p>
      <p className="mt-1 text-2xl font-extrabold text-coral">{wallet.paid}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">+ {wallet.free} free today</p>
      <RefreshPoller />
    </div>
  );
}
