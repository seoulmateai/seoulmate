import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

// 로그인이 필요한 경로
const PROTECTED_PATHS = ["/chats", "/settings", "/onboarding", "/billing/success"];
// 로그인한 사용자는 들어올 필요 없는 경로
const AUTH_PATHS = ["/login"];

const matches = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // createServerClient와 getClaims() 사이에 다른 코드를 넣지 말 것 (세션 갱신이 꼬일 수 있음).
  // getClaims()는 JWT 서명을 검증하고, 필요하면 토큰을 갱신해 쿠키에 기록한다.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;

  if (!isLoggedIn && matches(pathname, PROTECTED_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (isLoggedIn && matches(pathname, AUTH_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/chats";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  // 반드시 이 response를 그대로 반환해야 갱신된 세션 쿠키가 브라우저에 전달된다.
  return response;
}

// 리다이렉트할 때도 갱신된 세션 쿠키를 유지
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
