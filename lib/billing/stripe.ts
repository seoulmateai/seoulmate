import "server-only";

import Stripe from "stripe";

import { isBillingEnabled } from "./config";

// 모듈 최상단에서 new Stripe()를 하면 키가 없는 Production 빌드가 깨지므로 처음 쓸 때 생성.
// 결제가 꺼져 있으면 null.
let client: Stripe | null | undefined;

export function getStripe() {
  if (client === undefined) {
    client = isBillingEnabled() ? new Stripe(process.env.STRIPE_SECRET_KEY!) : null;
  }
  return client;
}
