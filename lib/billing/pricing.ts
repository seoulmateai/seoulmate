// 루비 가격·토큰 가중치 (서버·클라이언트 공용, 외부 import 없음 → node --test로 바로 테스트)
//
//   점수 = 입력토큰 × input + (출력토큰 + thinking 토큰) × output
//   5000점이 쌓일 때마다 1루비 차감 (실제 차감은 DB 함수 charge_ruby_usage)
//   1루비 = 100원
//
// 모델을 바꾸면 TOKEN_WEIGHTS에 새 모델을 추가한다 (없으면 DEFAULT_WEIGHTS)

export const POINTS_PER_RUBY = 5000;
export const WON_PER_RUBY = 100;
/** 판매하는 루비 팩 (Polar 상품 ID는 env POLAR_PRODUCT_RUBY_{팩}) */
export const RUBY_PACKS = [50, 100, 150] as const;
export type RubyPack = (typeof RUBY_PACKS)[number];

/** 하루 무료 루비 기본값 (env FREE_DAILY_RUBIES로 변경) */
export const DEFAULT_FREE_DAILY_RUBIES = 10;

/** 루비 잔액. free = 오늘 남은 무료 루비, paid = 충전한 루비, pendingPoints = 다음 1루비까지 쌓인 점수 */
export type RubyWallet = { free: number; paid: number; pendingPoints: number };

/** 쓸 수 있는 루비가 1개 이상인지 */
export function canSpend(wallet: RubyWallet) {
  return wallet.free + wallet.paid >= 1;
}

export type TokenWeights = { input: number; output: number };

export const DEFAULT_WEIGHTS: TokenWeights = { input: 1, output: 8 };

export const TOKEN_WEIGHTS: Record<string, TokenWeights> = {
  "gemini-3.5-flash-lite": { input: 1, output: 8 },
};

export function weightsFor(model: string): TokenWeights {
  return TOKEN_WEIGHTS[model] ?? DEFAULT_WEIGHTS;
}

export type TokenUsage = { input?: number; output?: number; thoughts?: number };

/** LLM 호출 1회의 가중 점수 (정수, 음수·누락 값은 0으로) */
export function toPoints(usage: TokenUsage, model: string): number {
  const w = weightsFor(model);
  const n = (v: number | undefined) => (Number.isFinite(v) && v! > 0 ? Math.floor(v!) : 0);
  return n(usage.input) * w.input + (n(usage.output) + n(usage.thoughts)) * w.output;
}

/** 다음 루비가 빠지기까지 남은 점수 (진행바 표시용) */
export function pointsUntilNextRuby(pendingPoints: number): number {
  return POINTS_PER_RUBY - pendingPoints;
}
