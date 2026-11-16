import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_WEIGHTS, POINTS_PER_RUBY, toPoints, weightsFor } from "./pricing.ts";

const MODEL = "gemini-3.5-flash-lite";

test("입력 ×1 + 출력 ×8", () => {
  assert.equal(toPoints({ input: 1800, output: 150 }, MODEL), 3000);
});

test("thinking 토큰은 출력과 같은 가중치", () => {
  assert.equal(toPoints({ input: 1000, output: 100, thoughts: 50 }, MODEL), 1000 + 150 * 8);
});

test("누락·음수·소수 값은 0 또는 내림", () => {
  assert.equal(toPoints({}, MODEL), 0);
  assert.equal(toPoints({ input: -5, output: undefined, thoughts: Number.NaN }, MODEL), 0);
  assert.equal(toPoints({ input: 10.9, output: 1.5 }, MODEL), 10 + 8);
});

test("등록 안 된 모델은 기본 가중치", () => {
  assert.deepEqual(weightsFor("unknown-model"), DEFAULT_WEIGHTS);
  assert.equal(toPoints({ input: 100, output: 10 }, "unknown-model"), 180);
});

test("1루비 = 5000점", () => {
  assert.equal(POINTS_PER_RUBY, 5000);
});
