import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_AFTER_LOGIN, safeNextPath } from "./next-path.ts";

test("같은 사이트 경로는 쿼리·해시까지 유지한다", () => {
  for (const path of ["/", "/chats", "/chats/abc?tab=1#top", "/search?q=https://evil.example"]) {
    assert.equal(safeNextPath(path), path);
  }
});

test("경로가 아닌 값과 외부 주소는 기본 경로로 보낸다", () => {
  for (const raw of [null, undefined, "", "chats", "https://evil.example", "javascript:alert(1)"]) {
    assert.equal(safeNextPath(raw), DEFAULT_AFTER_LOGIN);
  }
});

test("브라우저가 외부 주소로 해석하는 값을 막는다", () => {
  for (const raw of [
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/\t\\evil.example",
  ]) {
    assert.equal(safeNextPath(raw), DEFAULT_AFTER_LOGIN, JSON.stringify(raw));
  }
});

test("정규화 후 //로 시작하게 되는 경로를 막는다", () => {
  for (const raw of ["/.//evil.example", "/a/..//evil.example", "/./\\evil.example"]) {
    assert.equal(safeNextPath(raw), DEFAULT_AFTER_LOGIN, JSON.stringify(raw));
  }
});

test("fallback 인자를 사용한다", () => {
  assert.equal(safeNextPath("//evil.example", "/home"), "/home");
});
