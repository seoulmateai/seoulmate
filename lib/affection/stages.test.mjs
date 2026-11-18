import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clampAffection,
  clampAffectionDelta,
  nextEpisodeStage,
  stageIndex,
  stageLabel,
} from "./stages.ts";

test("stage boundaries", () => {
  assert.equal(stageIndex(0), 0);
  assert.equal(stageIndex(19), 0);
  assert.equal(stageIndex(20), 1);
  assert.equal(stageIndex(59), 2);
  assert.equal(stageIndex(60), 3);
  assert.equal(stageIndex(99), 4);
  assert.equal(stageIndex(100), 5);
  assert.equal(stageIndex(150), 5);
  assert.equal(stageIndex(-3), 0);
  assert.equal(stageLabel(stageIndex(64)), "Crush");
  assert.equal(stageLabel(5), "Beloved");
});

test("clamping", () => {
  assert.equal(clampAffection(130), 100);
  assert.equal(clampAffection(-1), 0);
  assert.equal(clampAffectionDelta(10), 10);
  assert.equal(clampAffectionDelta(15), 10);
  assert.equal(clampAffectionDelta(-15), -10);
  assert.equal(clampAffectionDelta(2.6), 3);
  assert.equal(clampAffectionDelta(undefined), 0);
  assert.equal(clampAffectionDelta("3"), 0);
  assert.equal(clampAffectionDelta(Number.NaN), 0);
});

test("next episode", () => {
  const all = ["a", "b", "c", "d", "e"];
  assert.equal(nextEpisodeStage({ unlockedStage: 0, playedStage: 0 }, all), null);
  assert.equal(nextEpisodeStage({ unlockedStage: 1, playedStage: 0 }, all), 1);
  assert.equal(nextEpisodeStage({ unlockedStage: 3, playedStage: 1 }, all), 2);
  assert.equal(nextEpisodeStage({ unlockedStage: 3, playedStage: 3 }, all), null);
  // 비어 있는 시나리오는 건너뜀
  assert.equal(nextEpisodeStage({ unlockedStage: 3, playedStage: 0 }, [null, " ", "c", null, null]), 3);
  assert.equal(nextEpisodeStage({ unlockedStage: 2, playedStage: 0 }, [null, "", "c", null, null]), null);
});
