export const DEFAULT_AFTER_LOGIN = "/chats";

const INTERNAL_ORIGIN = "http://internal.invalid";

// 로그인 후 이동할 경로. 외부 URL(오픈 리다이렉트)을 막기 위해 같은 사이트 내 경로만 허용.
// 브라우저는 탭·줄바꿈을 지우고 \를 /로 읽으므로, 문자열 패턴이 아니라 URL 해석 결과로 판단한다.
export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN) {
  if (!raw?.startsWith("/")) return fallback;

  let url: URL;
  try {
    url = new URL(raw, INTERNAL_ORIGIN);
  } catch {
    return fallback;
  }

  // 정규화된 값을 반환하므로 "/.//evil.example"처럼 정규화 후 //가 되는 경로도 막아야 한다
  if (url.origin !== INTERNAL_ORIGIN || url.pathname.startsWith("//")) return fallback;

  return url.pathname + url.search + url.hash;
}
