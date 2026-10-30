export const DEFAULT_AFTER_LOGIN = "/chats";

// 로그인 후 이동할 경로. 외부 URL(오픈 리다이렉트)을 막기 위해 같은 사이트 내 경로만 허용.
export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  return raw;
}
