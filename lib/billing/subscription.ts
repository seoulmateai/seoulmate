import "server-only";

import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

import { isBillingEnabled, isStripeLiveMode } from "./config";
import { getStripe } from "./stripe";

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

// 결제 실패(past_due)는 Stripe가 재시도하는 동안에도 혜택을 끊는다
const ENTITLED_STATUSES = new Set(["active", "trialing"]);
const ENDED_STATUSES = new Set(["canceled", "incomplete_expired"]);

export function isEndedStatus(status: string | null) {
  return status != null && ENDED_STATUSES.has(status);
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await createAdminClient()
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** 구독 혜택 대상인지. 해지 예약(cancel_at_period_end)이어도 기간이 끝날 때까지는 active */
export function isEntitled(subscription: Subscription | null) {
  return (
    subscription != null &&
    subscription.status != null &&
    ENTITLED_STATUSES.has(subscription.status) &&
    subscription.livemode === isStripeLiveMode()
  );
}

/**
 * 결제가 꺼져 있으면(Production) DB에 무엇이 있든 항상 false.
 * Production과 Preview가 같은 DB를 쓰므로 Preview에서 한 테스트 결제가 Production에 반영되지 않게 한다.
 */
export async function isActiveSubscriber(userId: string) {
  if (!isBillingEnabled()) return false;
  return isEntitled(await getSubscription(userId));
}

/**
 * 회원 탈퇴용: 결제 관련 정리. 결제가 꺼져 있으면 아무것도 하지 않는다.
 *  1. 열려 있는 결제 페이지(Checkout Session) 만료 → 탈퇴 후 결제 완료 방지
 *  2. 진행 중인 구독 즉시 취소
 * 실패하면 throw → 탈퇴를 중단해야 계정은 지워졌는데 결제만 계속되는 일이 없다.
 * (1과 계정 삭제 사이에 결제가 끝나는 경우는 lib/billing/orphan.ts가 환불·취소한다)
 * 반환: Stripe 고객 id (계정 삭제 후 재확인용, 행이 cascade로 지워지기 전에 받아둔다). 없으면 null
 */
export async function cancelBillingForDeletion(userId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const subscription = await getSubscription(userId);
  if (!subscription) return null;
  const customerId = subscription.stripe_customer_id;

  for await (const session of stripe.checkout.sessions.list({ customer: customerId, status: "open" })) {
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (e) {
      // 목록 조회 후 그사이 결제 완료·만료된 세션이면 넘어감 (완료된 결제는 webhook이 처리)
      const latest = await stripe.checkout.sessions.retrieve(session.id);
      if (latest.status === "open") throw e;
    }
  }

  // DB 상태는 webhook 반영 전일 수 있으므로 믿지 않고 구독 id가 있으면 항상 취소를 시도
  if (!subscription.stripe_subscription_id) return customerId;
  try {
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  } catch (e) {
    // 이미 취소된 구독(webhook 반영 전)은 성공으로 간주
    if (e instanceof Stripe.errors.StripeInvalidRequestError && e.code === "resource_missing") {
      return customerId;
    }
    const latest = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    if (!isEndedStatus(latest.status)) throw e;
  }
  return customerId;
}
