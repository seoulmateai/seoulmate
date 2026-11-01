import { NextResponse, type NextRequest } from "next/server";

import { stripePriceId } from "@/lib/billing/config";
import { getOrCreateStripeCustomer } from "@/lib/billing/customer";
import { getStripe } from "@/lib/billing/stripe";
import { getSubscription, isEntitled } from "@/lib/billing/subscription";
import { captureServerEvent } from "@/lib/posthog/server";
import { createClient } from "@/lib/supabase/server";

// 구독 시작: Stripe Checkout 세션을 만들고 URL을 돌려준다 (클라이언트가 location.href로 이동).
// 실제 구독 반영은 webhook(/api/stripe/webhook) 기준.
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  // 결제가 꺼진 환경(Production)에서는 없는 경로처럼 응답
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

  // subscriptions.user_id → profiles FK
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ ok: false, error: "ONBOARDING_REQUIRED" }, { status: 403 });
  }

  try {
    // 이미 구독 중이면 중복 결제 대신 구독 관리(Portal)로 안내
    if (isEntitled(await getSubscription(user.id))) {
      return NextResponse.json({ ok: false, error: "ALREADY_SUBSCRIBED" }, { status: 409 });
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email);
    // Preview 배포마다 도메인이 달라서 요청 origin 기준으로 돌아올 주소를 만든다
    const baseUrl = request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: stripePriceId(), quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancel`,
    });
    if (!session.url) throw new Error("Checkout session has no url");

    captureServerEvent(user.id, "checkout_started");
    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    console.error("[stripe] checkout failed", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
