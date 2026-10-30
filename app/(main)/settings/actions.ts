"use server";

import { createClient } from "@/lib/supabase/server";
import { inquirySchema } from "@/lib/validation/inquiry";
import { nicknameSchema } from "@/lib/validation/onboarding";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function getUserClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// RLS + 컬럼 권한: 본인 행의 nickname만 수정 가능
export async function updateNickname(input: unknown): Promise<ActionResult> {
  const parsed = nicknameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user } = await getUserClient();
  if (!user) return { ok: false, error: "Your session has expired. Please log in again." };

  const { error } = await supabase
    .from("profiles")
    .update({ nickname: parsed.data })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Couldn't update your nickname. Please try again." };
  return { ok: true };
}

// RLS: user_id는 DB 기본값 auth.uid()로 채워짐
export async function submitInquiry(input: unknown): Promise<ActionResult> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user } = await getUserClient();
  if (!user) return { ok: false, error: "Your session has expired. Please log in again." };

  const { error } = await supabase.from("inquiries").insert(parsed.data);
  if (error) return { ok: false, error: "Couldn't send your inquiry. Please try again." };
  return { ok: true };
}
