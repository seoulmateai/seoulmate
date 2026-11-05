import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const DEMO_EMAIL = "local-demo@seoulmate.dev";
const DEMO_NICKNAME = "Demo";
const DEMO_BIRTH_DATE = "1995-01-01";

// 로컬 `next dev` 전용. 비밀번호는 만들지 않고, service role로 일회용 매직링크를 발급해 그 세션만 심는다.
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const failed = NextResponse.redirect(
    new URL(`/login?error=demo_failed&next=${encodeURIComponent(next)}`, request.url),
  );

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_EMAIL,
  });
  const tokenHash = link?.properties?.hashed_token;
  const userId = link?.user?.id;
  if (linkError || !tokenHash || !userId) return failed;

  const { data: profile, error: profileReadError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (profileReadError) return failed;

  if (!profile) {
    const { error: insertError } = await admin.from("profiles").insert({
      id: userId,
      nickname: DEMO_NICKNAME,
      birth_date: DEMO_BIRTH_DATE,
    });
    if (insertError && insertError.code !== "23505") return failed;
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (otpError) return failed;

  return response;
}
