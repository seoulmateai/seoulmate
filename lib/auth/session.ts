import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// 한 요청 안에서 layout(채팅 목록)과 page(채팅방)가 같이 호출해도 인증·프로필 조회는 1번만
const getSession = cache(async () => {
  const supabase = await createClient();
  // getClaims()는 JWT 서명을 로컬에서 검증 (비대칭 서명 키 사용 시 Auth 서버 왕복 없음).
  // 토큰 갱신은 proxy.ts가 이미 처리했다.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const user = { id: claims.sub, email: claims.email as string | undefined };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
});

/**
 * 로그인 + 온보딩 완료 사용자만 통과. 아니면 /login 또는 /onboarding으로 보낸다.
 * cookies를 읽으므로 Suspense 안의 컴포넌트에서 호출할 것.
 */
export async function requireOnboardedUser(next: string) {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);

  const { supabase, user, profile } = session;
  if (!profile) redirect(`/onboarding?next=${encodeURIComponent(next)}`);

  return { supabase, user, profile };
}
