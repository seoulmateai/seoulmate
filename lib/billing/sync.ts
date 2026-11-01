import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { refundAndCancelOrphanSubscription } from "./orphan";
import { getStripe } from "./stripe";
import { isEndedStatus } from "./subscription";

/**
 * Stripe에서 구독을 다시 조회해 subscriptions 행을 갱신한다.
 * webhook 이벤트 본문 대신 최신 상태를 읽으므로 이벤트 순서가 바뀌거나 중복 수신돼도 결과가 같다.
 *
 * 사용자 매핑: Checkout 시작 시 만든 행(stripe_customer_id) → 없으면 subscription.metadata.user_id
 * 반환: 저장한 사용자 id. 저장하지 않았으면(건너뜀·탈퇴한 사용자) null
 */
export async function syncSubscription(subscriptionId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Billing is disabled");

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const admin = createAdminClient();
  const { data: existing, error: findError } = await admin
    .from("subscriptions")
    .select("user_id, stripe_subscription_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (findError) throw findError;

  const userId = existing?.user_id ?? subscription.metadata.user_id;
  if (!userId) {
    throw new Error(`No user for Stripe customer ${customerId} (subscription ${subscriptionId})`);
  }

  if (isEndedStatus(subscription.status)) {
    // 끝난 구독인데 저장할 필요가 없는 경우 건너뛴다 (끝난 구독은 더 청구되지 않음)
    //  - 행 없음: 회원 탈퇴로 이미 삭제됨 (탈퇴 시 구독 취소 → deleted 이벤트가 나중에 도착)
    //  - 다른 구독 id: 해지 후 재구독했는데 이전 구독의 종료 이벤트가 늦게 옴 → 새 구독을 덮어쓰지 않음
    if (!existing) return null;
    if (existing.stripe_subscription_id && existing.stripe_subscription_id !== subscription.id) {
      return null;
    }
  } else if (!existing) {
    // 진행 중인 구독인데 행이 없다 = 결제 페이지를 열어 둔 채 탈퇴한 뒤 결제를 완료한 경우.
    // 혜택을 받을 사용자가 없으므로 환불하고 취소한다 (그대로 두면 매달 청구됨)
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) {
      await refundAndCancelOrphanSubscription(stripe, subscription);
      return null;
    }
  }

  // 이 API 버전에서는 기간 정보가 구독이 아니라 항목(item)에 있다. 항목은 하나만 사용
  const item = subscription.items.data[0];
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: item?.price.id ?? null,
      current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      livemode: subscription.livemode,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  return userId;
}
