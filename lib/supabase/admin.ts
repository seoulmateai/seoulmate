import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// service role 클라이언트: RLS를 우회하므로 서버(Route Handler / Server Action)에서만 사용.
// 메시지·채팅방 저장, 사용량 RPC(consume_reply_quota), auth.admin.deleteUser 등에 사용.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
