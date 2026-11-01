import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import type { Database } from "./database.types";

// Server Component / Server Action / Route Handler용. 사용자 세션(쿠키) 기준으로 RLS 적용.
export async function createClient() {
  const cookieStore = await cookies();
  // supabase-js가 세션 만료 확인에 Date.now()를 써서 prerender 중 실행되면 에러 → 실제 요청 때만 실행
  await connection();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서는 쿠키를 쓸 수 없음. 세션 갱신은 proxy.ts가 담당.
          }
        },
      },
    },
  );
}
