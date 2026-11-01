"use server";

import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth/next-path";
import { captureServerEvent } from "@/lib/posthog/server";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/onboarding";

export type OnboardingResult = { error: string };

export async function completeOnboarding(
  input: unknown,
  rawNext: string,
): Promise<OnboardingResult | void> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { nickname, birthDate, marketingAgreed } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_nickname: nickname,
    p_birth_date: birthDate,
    p_marketing_agreed: marketingAgreed,
  });

  // 23505 = 이미 프로필이 있음(중복 제출) → 완료로 간주
  if (error && error.code !== "23505") {
    if (error.message.includes("NOT_AUTHENTICATED")) {
      return { error: "Your session has expired. Please log in again." };
    }
    if (error.message.includes("INVALID_BIRTH_DATE")) {
      return { error: "Please enter a valid date of birth." };
    }
    return { error: "Something went wrong. Please try again." };
  }

  if (!error) {
    const { data } = await supabase.auth.getClaims();
    if (data) {
      captureServerEvent(data.claims.sub, "onboarding_completed", {
        marketing_agreed: marketingAgreed,
      });
    }
  }

  redirect(safeNextPath(rawNext));
}
