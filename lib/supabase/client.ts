import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

// 브라우저(Client Component)용. anon key + RLS로 본인 데이터만 접근.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
