import assert from "node:assert/strict";
import { test } from "node:test";

import { parseMessageContent, serializeParts, splitInlineEmphasis } from "./content.ts";

test("빈 줄로 단락을 나누고 *...* 단락은 묘사로 본다", () => {
  assert.deepEqual(parseMessageContent("*그는 고개를 돌렸다.*\n\n왔어?\n\n오늘 좀 늦었네."), [
    { kind: "NARRATION", text: "그는 고개를 돌렸다." },
    { kind: "DIALOGUE", text: "왔어?" },
    { kind: "DIALOGUE", text: "오늘 좀 늦었네." },
  ]);
});

test("별표 없는 기존 메시지는 대사 하나", () => {
  assert.deepEqual(parseMessageContent("안녕\n반가워"), [{ kind: "DIALOGUE", text: "안녕\n반가워" }]);
});

test("사용자가 빈 줄 없이 묘사와 대사를 섞어 써도 줄 단위로 나눈다", () => {
  assert.deepEqual(parseMessageContent("*손을 흔든다*\n안녕!"), [
    { kind: "NARRATION", text: "손을 흔든다" },
    { kind: "DIALOGUE", text: "안녕!" },
  ]);
});

test("한 줄 안에 섞인 *강조*는 대사로 남긴다", () => {
  assert.deepEqual(parseMessageContent("*웃으며* 안녕 *손을 흔든다*"), [
    { kind: "DIALOGUE", text: "*웃으며* 안녕 *손을 흔든다*" },
  ]);
  assert.deepEqual(splitInlineEmphasis("*웃으며* 안녕"), [
    { text: "웃으며", emphasis: true },
    { text: " 안녕", emphasis: false },
  ]);
});

test("serializeParts 결과는 parseMessageContent로 그대로 되돌아온다", () => {
  const content = serializeParts([
    { kind: "NARRATION", text: "He *stops*\nwriting." },
    { kind: "NARRATION", text: "   " },
    { kind: "DIALOGUE", text: "Well.\n\n\nThat's new." },
  ]);
  assert.equal(content, "*He stops writing.*\n\nWell.\nThat's new.");
  assert.deepEqual(parseMessageContent(content), [
    { kind: "NARRATION", text: "He stops writing." },
    { kind: "DIALOGUE", text: "Well.\nThat's new." },
  ]);
});
