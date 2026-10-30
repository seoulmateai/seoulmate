import { z } from "zod";

// "YYYY-MM-DD" (KST 기준 오늘) — DB의 complete_onboarding도 미래 날짜를 거절함
function todayKst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

// profiles.nickname VARCHAR(30) — 마이페이지 닉네임 수정에서도 사용
export const nicknameSchema = z
  .string()
  .trim()
  .min(1, "Please enter a nickname.")
  .max(30, "Nickname must be 30 characters or fewer.");

export const onboardingSchema = z.object({
  nickname: nicknameSchema,
  birthDate: z
    .iso.date("Please enter your date of birth.")
    .refine((d) => d >= "1900-01-01" && d <= todayKst(), "Please enter a valid date of birth."),
  termsAgreed: z.boolean().refine((v) => v, "You must agree to the Terms of Service."),
  privacyAgreed: z.boolean().refine((v) => v, "You must agree to the Privacy Policy."),
  marketingAgreed: z.boolean(),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingValues = z.output<typeof onboardingSchema>;
