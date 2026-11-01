import "server-only";

import { cacheLife } from "next/cache";

import { stripePriceId } from "./config";
import { getStripe } from "./stripe";

export type PlanPrice = {
  /** 화면 표시용 금액 (예: "₩9,900", "$4.99") */
  amount: string;
  /** "month", "year" 등. 일회성 가격이면 null */
  interval: string | null;
};

/**
 * 요금제 페이지에 표시할 구독 가격. 모든 사용자에게 같으므로 공유 캐시.
 * 대시보드에서 가격을 바꾸면 STRIPE_PRICE_ID도 바뀌므로 캐시 키(priceId)가 달라진다.
 */
export async function getPlanPrice(): Promise<PlanPrice | null> {
  if (!getStripe()) return null;
  return fetchPlanPrice(stripePriceId());
}

async function fetchPlanPrice(priceId: string): Promise<PlanPrice | null> {
  "use cache";
  cacheLife("hours");

  const price = await getStripe()!.prices.retrieve(priceId);
  if (price.unit_amount == null) return null;

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency.toUpperCase(),
  });
  // Stripe 금액은 최소 단위(USD는 센트, KRW는 원). 통화별 소수 자릿수로 환산
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return {
    amount: formatter.format(price.unit_amount / 10 ** digits),
    interval: price.recurring?.interval ?? null,
  };
}
