import "server-only";

import { createPolar, type Environment, type Polar } from "@polar-sh/sdk/2026-10";

import { RUBY_PACKS, type RubyPack } from "./pricing";

// Polar 클라이언트 + 루비 팩 ↔ 상품 ID 매핑 (서버 전용)
//  - POLAR_SERVER=sandbox | production  (sandbox와 production 토큰·상품 ID는 서로 다름)
//  - 지급할 루비 수는 env의 상품 ID 기준으로 코드에서 결정 (Polar 상품 metadata는 참고용)

export function polarEnvironment(): Environment {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

let client: Polar | undefined;

export function getPolar() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) throw new Error("POLAR_ACCESS_TOKEN is not set");
  client ??= createPolar({ accessToken, environment: polarEnvironment() });
  return client;
}

export function productIdForPack(pack: RubyPack) {
  const id = process.env[`POLAR_PRODUCT_RUBY_${pack}`];
  if (!id) throw new Error(`POLAR_PRODUCT_RUBY_${pack} is not set`);
  return id;
}

/** Polar 상품 ID → 루비 수. 모르는 상품이면 null */
export function rubiesForProduct(productId: string | null | undefined): number | null {
  if (!productId) return null;
  return RUBY_PACKS.find((pack) => process.env[`POLAR_PRODUCT_RUBY_${pack}`] === productId) ?? null;
}
