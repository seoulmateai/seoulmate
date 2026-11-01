import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { getStripe } from "./stripe";

/**
 * 사용자의 Stripe 고객 id. 없으면 만들고 subscriptions 행(status NULL)을 생성한다.
 * 동시 요청: Stripe idempotencyKey로 고객은 1명만 생기고, DB는 ignoreDuplicates 후 다시 조회.
 */
export async function getOrCreateStripeCustomer(userId: string, email: string | undefined) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Billing is disabled");

  const admin = createAdminClient();
  const findCustomerId = async () => {
    const { data, error } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.stripe_customer_id ?? null;
  };

  const existing = await findCustomerId();
  if (existing) return existing;

  const customer = await stripe.customers.create(
    { email, metadata: { user_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  const { error } = await admin
    .from("subscriptions")
    .upsert(
      { user_id: userId, stripe_customer_id: customer.id, livemode: customer.livemode },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error) throw error;

  const customerId = await findCustomerId();
  if (!customerId) throw new Error(`Failed to store Stripe customer for ${userId}`);
  return customerId;
}
