import { Webhooks } from "@polar-sh/nextjs";

import { rubiesForProduct } from "@/lib/billing/polar";
import { creditRubies, refundRubies } from "@/lib/billing/wallet";
import { captureServerEvent } from "@/lib/posthog/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Polar webhook (Polar 대시보드에 등록: order.paid, order.refunded)
//  - 서명 검증은 @polar-sh/nextjs가 처리 (실패 403). 핸들러가 throw하면 Polar가 재시도
//  - 같은 주문이 여러 번 와도 DB 함수가 polar_order_id로 한 번만 반영
//  - 로그인 없이 Polar 서버가 호출 → proxy.ts 보호 경로에 넣지 말 것

type OrderLike = {
  id: string;
  product_id: string | null;
  net_amount: number;
  refunded_amount: number;
  metadata: Record<string, unknown>;
  customer: { external_id?: string | null };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 체크아웃 때 넣은 우리 사용자 id (customer.external_id 우선, 없으면 metadata.user_id) */
function userIdOf(order: OrderLike) {
  const id = order.customer.external_id ?? order.metadata.user_id;
  return typeof id === "string" && UUID.test(id) ? id : null;
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",

  onOrderPaid: async ({ data: order }) => {
    const userId = userIdOf(order);
    const rubies = rubiesForProduct(order.product_id);
    // 설정 문제라 재시도해도 같은 결과 → 로그만 남기고 200 (Polar 대시보드에서 다시 보낼 수 있음)
    if (!userId || !rubies) {
      console.error("[billing/webhook] order.paid ignored", {
        order_id: order.id,
        product_id: order.product_id,
        has_user: userId != null,
      });
      return;
    }

    const balance = await creditRubies(createAdminClient(), {
      userId,
      amount: rubies,
      orderId: order.id,
    });
    if (balance == null) return; // 이미 처리한 주문

    captureServerEvent(userId, "rubies_purchased", {
      rubies,
      amount_cents: order.total_amount,
      currency: order.currency,
    });
  },

  // 환불 금액 비율만큼 회수 (한 주문의 첫 환불만 반영 — 부분 환불을 여러 번 하면 두 번째부터는 수동 처리)
  // 가격은 세금 포함이라 total_amount = net_amount + tax_amount. refunded_amount는 세금 제외 금액이므로
  // 같은 기준인 net_amount로 나눈다 (total_amount로 나누면 세금만큼 덜 회수됨)
  onOrderRefunded: async ({ data: order }) => {
    const userId = userIdOf(order);
    const rubies = rubiesForProduct(order.product_id);
    if (!userId || !rubies || order.net_amount <= 0) {
      console.error("[billing/webhook] order.refunded ignored", { order_id: order.id });
      return;
    }

    const amount = Math.min(rubies, Math.ceil((rubies * order.refunded_amount) / order.net_amount));
    if (amount <= 0) return;

    const taken = await refundRubies(createAdminClient(), { userId, amount, orderId: order.id });
    if (taken == null) return;

    captureServerEvent(userId, "rubies_refunded", {
      rubies: amount,
      rubies_taken: taken,
      refunded_cents: order.refunded_amount,
    });
  },
});
