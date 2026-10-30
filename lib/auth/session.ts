import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * 로그인 + 온보딩 완료 사용자만 통과. 아니면 /login 또는 /onboarding으로 보낸다.
 * cookies를 읽으므로 Suspense 안의 컴포넌트에서 호출할 것.
 */
export async function requireOnboardedUser(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect(`/onboarding?next=${encodeURIComponent(next)}`);

  return { supabase, user, profile };
}
