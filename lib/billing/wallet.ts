import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { DEFAULT_FREE_DAILY_RUBIES, toPoints, type RubyWallet, type TokenUsage } from "./pricing";

// 루비 지갑 (DB 함수 래퍼). 잔액 계산·차감 규칙은 supabase/migrations/20261116000000_rubies.sql
// 모두 service role(createAdminClient) 전용

type Admin = SupabaseClient<Database>;

export function freeDailyRubies() {
  const n = Number(process.env.FREE_DAILY_RUBIES);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_FREE_DAILY_RUBIES;
}

/** 현재 잔액 (오늘 무료 루비를 아직 안 채웠으면 채워진 값으로) */
export async function getWallet(admin: Admin, userId: string): Promise<RubyWallet> {
  const { data, error } = await admin
    .rpc("get_ruby_wallet", { p_user_id: userId, p_free_daily: freeDailyRubies() })
    .single();
  if (error) throw error;
  return { free: data.free_balance, paid: data.paid_balance, pendingPoints: data.pending_points };
}

/**
 * LLM 호출 1회 과금. 점수를 쌓고 5000점마다 1루비 차감 (무료 → 유료 순).
 * llmCallId를 넘기면 llm_calls.weighted_points / rubies_charged도 기록된다.
 */
export async function chargeUsage(
  admin: Admin,
  {
    userId,
    usage,
    model,
    llmCallId,
  }: { userId: string; usage: TokenUsage; model: string; llmCallId?: number | null },
): Promise<{ charged: number; wallet: RubyWallet }> {
  const { data, error } = await admin
    .rpc("charge_ruby_usage", {
      p_user_id: userId,
      p_points: toPoints(usage, model),
      p_free_daily: freeDailyRubies(),
      p_llm_call_id: llmCallId ?? undefined,
    })
    .single();
  if (error) throw error;
  return {
    charged: data.rubies_charged,
    wallet: { free: data.free_balance, paid: data.paid_balance, pendingPoints: data.pending_points },
  };
}

/**
 * 유료 루비 충전. PURCHASE는 Polar 주문 id 필수 (같은 주문은 한 번만 반영).
 * 반환: 충전 후 유료 잔액, 이미 처리한 주문이면 null
 */
export async function creditRubies(
  admin: Admin,
  {
    userId,
    amount,
    orderId,
    type = "PURCHASE",
  }: { userId: string; amount: number; orderId?: string; type?: "PURCHASE" | "ADMIN" },
): Promise<number | null> {
  const { data, error } = await admin.rpc("credit_rubies", {
    p_user_id: userId,
    p_amount: amount,
    p_order_id: orderId,
    p_type: type,
  });
  if (error) throw error;
  return data;
}

/** 환불된 주문만큼 유료 루비 회수. 반환: 실제 회수한 루비, 이미 처리했으면 null */
export async function refundRubies(
  admin: Admin,
  { userId, amount, orderId }: { userId: string; amount: number; orderId: string },
): Promise<number | null> {
  const { data, error } = await admin.rpc("refund_rubies", {
    p_user_id: userId,
    p_amount: amount,
    p_order_id: orderId,
  });
  if (error) throw error;
  return data;
}
