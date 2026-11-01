import "server-only";

// 결제 on/off는 환경변수로만 결정한다.
// Production에는 Stripe 키를 두지 않으므로 항상 꺼짐 → 결제 UI·API가 숨겨지고 모두 무료 사용자로 처리.
// Stripe 키는 Vercel Preview(feat/billing 브랜치)와 로컬 .env.local 에만 둔다.
export function isBillingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/** 라이브 키(sk_live_ / rk_live_)인지. 테스트 모드에서 만든 구독을 라이브에서 인정하지 않기 위해 사용 */
export function isStripeLiveMode() {
  return /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
}

export function stripePriceId() {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not set");
  return priceId;
}

export function stripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
}
