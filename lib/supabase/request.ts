import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { createClient as createCookieClient } from "./server";

const BEARER = /^Bearer\s+(\S+)\s*$/i;

/**
 * Route Handler용. 앱은 Authorization: Bearer access token, 웹은 쿠키 세션.
 * 쿠키 경로의 동작은 createClient()와 같다.
 */
export async function getRequestUser(request: Request): Promise<{
  supabase: SupabaseClient<Database>;
  user: { id: string; email?: string } | null;
}> {
  const token = request.headers.get("authorization")?.match(BEARER)?.[1];

  if (!token) {
    const supabase = await createCookieClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return {
      supabase,
      user: user ? { id: user.id, email: user.email } : null,
    };
  }

  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: { id: data.user.id, email: data.user.email } };
}
