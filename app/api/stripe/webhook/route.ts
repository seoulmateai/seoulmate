import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripeWebhookSecret } from "@/lib/billing/config";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { captureServerEvent } from "@/lib/posthog/server";

// Stripe webhook → subscriptions 갱신.
// 어떤 이벤트든 구독 id만 뽑아 Stripe에서 최신 상태를 다시 조회한다 (lib/billing/sync.ts).
// 처리 실패 시 500을 돌려주면 Stripe가 재시도한다.
//
// Stripe 대시보드 endpoint 이벤트: checkout.session.completed, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
// Preview 배포 보호가 켜져 있으면 URL에 ?x-vercel-protection-bypass=<secret> 를 붙일 것
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ ok: false }, { status: 404 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false }, { status: 400 });

  // 서명 검증에는 가공하지 않은 원본 본문이 필요
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret());
  } catch (e) {
    console.error("[stripe] webhook signature verification failed", e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const userId = await syncSubscription(subscriptionId);
        // 탈퇴한 사용자의 결제(환불·취소 처리됨)는 구독으로 기록하지 않음
        if (userId) captureServerEvent(userId, "subscribed");
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object.id);
        break;
      case "invoice.payment_failed": {
        const subscription = event.data.object.parent?.subscription_details?.subscription;
        if (!subscription) break;
        await syncSubscription(typeof subscription === "string" ? subscription : subscription.id);
        break;
      }
    }
  } catch (e) {
    console.error(`[stripe] webhook ${event.type} (${event.id}) failed`, e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
