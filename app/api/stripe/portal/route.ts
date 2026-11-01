import { NextResponse, type NextRequest } from "next/server";

import { getStripe } from "@/lib/billing/stripe";
import { getSubscription } from "@/lib/billing/subscription";
import { captureServerEvent } from "@/lib/posthog/server";
import { createClient } from "@/lib/supabase/server";

// 구독 관리(해지·카드 변경): Stripe Customer Portal 세션 URL을 돌려준다
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // 다른 사이트에서 보낸 요청 차단
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  try {
    const subscription = await getSubscription(user.id);
    if (!subscription) {
      return NextResponse.json({ ok: false, error: "NO_CUSTOMER" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${request.nextUrl.origin}/settings`,
    });

    captureServerEvent(user.id, "subscription_portal_opened");
    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    console.error("[stripe] portal failed", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
