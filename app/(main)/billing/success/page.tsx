import { CircleCheck, Gem, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { RefreshPoller } from "@/components/billing/refresh-poller";
import { requireOnboardedUser } from "@/lib/auth/session";
import { findOrderIdForCheckout } from "@/lib/billing/polar";
import { getWallet } from "@/lib/billing/wallet";
import { createAdminClient } from "@/lib/supabase/admin";

// Polar 결제 후 돌아오는 페이지 (?checkout_id=...)
// 루비 지급은 webhook 기준 → 이 결제의 주문이 ruby_transactions에 반영됐는지 확인하고,
// 아직이면 1초마다 새로고침 (RefreshPoller, 최대 30초)
export default function BillingSuccessPage({ searchParams }: PageProps<"/billing/success">) {
  return (
    <div className="page-container flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
      <Suspense fallback={<Pending />}>
        <Status searchParams={searchParams} />
      </Suspense>
      <div className="flex gap-5 text-sm font-bold">
        <Link href="/chats" className="text-coral hover:underline">
          Back to chats
        </Link>
        <Link href="/shop" className="text-muted-foreground hover:underline">
          Ruby shop
        </Link>
      </div>
    </div>
  );
}

async function Status({ searchParams }: Pick<PageProps<"/billing/success">, "searchParams">) {
  const { checkout_id } = await searchParams;
  const checkoutId = typeof checkout_id === "string" ? checkout_id : null;
  const { user } = await requireOnboardedUser(
    `/billing/success${checkoutId ? `?checkout_id=${encodeURIComponent(checkoutId)}` : ""}`,
  );
  const admin = createAdminClient();

  let credited: number | null = null;
  if (checkoutId) {
    try {
      const orderId = await findOrderIdForCheckout(checkoutId, user.id);
      if (orderId) {
        const { data } = await admin
          .from("ruby_transactions")
          .select("paid_delta")
          .eq("polar_order_id", orderId)
          .eq("type", "PURCHASE")
          .maybeSingle();
        credited = data?.paid_delta ?? null;
      }
    } catch (e) {
      console.error("[billing/success] order lookup failed", e);
    }
  }

  if (credited == null) {
    return (
      <>
        <Pending />
        <RefreshPoller />
      </>
    );
  }

  const wallet = await getWallet(admin, user.id);
  return (
    <>
      <div className="grid size-14 place-items-center rounded-full bg-coral-soft text-coral">
        <CircleCheck className="size-7" aria-hidden />
      </div>
      <div>
        <h1 className="mb-2 text-2xl font-bold">{credited} rubies added!</h1>
        <p className="text-sm text-muted-foreground">Thanks for your purchase.</p>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-6 py-4">
        <Gem className="size-5 text-coral" aria-hidden />
        <span className="text-2xl font-extrabold">{wallet.free + wallet.paid}</span>
        <span className="text-xs text-muted-foreground">
          ({wallet.paid} purchased + {wallet.free} free today)
        </span>
      </div>
    </>
  );
}

function Pending() {
  return (
    <>
      <div className="grid size-14 place-items-center rounded-full bg-coral-soft text-coral">
        <Loader2 className="size-7 animate-spin" aria-hidden />
      </div>
      <div>
        <h1 className="mb-2 text-2xl font-bold">Adding your rubies…</h1>
        <p className="text-sm text-muted-foreground">
          This usually takes a few seconds. If your rubies don&apos;t show up within a few
          minutes, please{" "}
          <Link href="/settings/inquiry" className="font-bold text-coral hover:underline">
            contact us
          </Link>
          .
        </p>
      </div>
    </>
  );
}
