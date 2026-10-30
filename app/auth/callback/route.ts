import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";

// 로그인 후 공통 진입점
//  - Google OAuth / 이메일 인증 링크: ?code= 를 세션으로 교환
//  - 이메일·비밀번호 로그인: code 없이 들어와서 프로필 확인만
// 프로필이 없으면 /onboarding, 있으면 next(기본 /chats)로 보낸다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
