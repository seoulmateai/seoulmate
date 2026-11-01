import "server-only";

import Stripe from "stripe";

import { getStripe } from "./stripe";
import { isEndedStatus } from "./subscription";

// 탈퇴한 사용자에게 남은 구독 정리 (혜택을 받을 사용자가 없으므로 전액 환불 + 즉시 취소).
// 두 곳에서 호출해 빈틈을 막는다:
//  - webhook(lib/billing/sync.ts): 탈퇴 후 도착한 결제 완료 이벤트
//  - 탈퇴 API: 계정 삭제 직후 재확인. 탈퇴 도중 결제가 끝나 webhook이 삭제 전에 정상 저장한 경우

/**
 * 계정 삭제 직후 호출: 고객에게 아직 끝나지 않은 구독이 있으면 환불·취소.
 * 탈퇴 시 기존 구독은 이미 취소했으므로, 여기서 찾는 것은 탈퇴 도중 새로 생긴 구독뿐이다.
 */
export async function refundAndCancelRemainingSubscriptions(customerId: string) {
  const stripe = getStripe();
  if (!stripe) return;

  for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all" })) {
    if (isEndedStatus(subscription.status)) continue;
    await refundAndCancelOrphanSubscription(stripe, subscription);
  }
}

/**
 * 결제된 금액을 전액 환불한 뒤 즉시 취소.
 * 환불을 먼저 한다. 취소가 먼저 성공하고 환불이 실패하면, 재시도 때 구독이 이미 끝난 상태라
 * 건너뛰어져 환불이 영영 안 되기 때문. 반대로 환불 후 취소가 실패하면 재시도에서
 * 환불은 idempotencyKey로 중복되지 않고 취소만 다시 시도한다.
 * webhook과 탈퇴 API가 동시에 호출해도 환불은 한 번만 일어난다.
 */
export async function refundAndCancelOrphanSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  console.warn(`[stripe] refunding and canceling subscription ${subscription.id} of a deleted user`);

  for await (const invoice of stripe.invoices.list({ subscription: subscription.id, status: "paid" })) {
    for await (const payment of stripe.invoicePayments.list({ invoice: invoice.id!, status: "paid" })) {
      const { payment_intent, charge } = payment.payment;
      const target = payment_intent
        ? { payment_intent: typeof payment_intent === "string" ? payment_intent : payment_intent.id }
        : charge
          ? { charge: typeof charge === "string" ? charge : charge.id }
          : null;
      if (!target) continue;

      try {
        await stripe.refunds.create(
          {
            ...target,
            reason: "requested_by_customer",
            metadata: { reason: "account_deleted", subscription_id: subscription.id },
          },
          { idempotencyKey: `orphan-refund-${payment.id}` },
        );
      } catch (e) {
        // idempotencyKey가 만료된(24시간) 뒤 재시도돼도 이미 환불된 결제면 성공으로 간주
        if (e instanceof Stripe.errors.StripeInvalidRequestError && e.code === "charge_already_refunded") {
          continue;
        }
        throw e;
      }
    }
  }

  try {
    await stripe.subscriptions.cancel(subscription.id);
  } catch (e) {
    const latest = await stripe.subscriptions.retrieve(subscription.id);
    if (!isEndedStatus(latest.status)) throw e;
  }
}
