import { z } from "zod";

// DB inquiries.category CHECK 목록과 일치
export const INQUIRY_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "ACCOUNT", label: "Account" },
  { value: "BUG", label: "Bug report" },
  { value: "CHARACTER", label: "Characters" },
  { value: "SUGGESTION", label: "Suggestion" },
  { value: "OTHER", label: "Other" },
] as const;

export const inquirySchema = z.object({
  email: z.email("Please enter a valid email.").max(255),
  category: z.enum(INQUIRY_CATEGORIES.map((c) => c.value)),
  title: z
    .string()
    .trim()
    .min(1, "Please enter a title.")
    .max(100, "Title must be 100 characters or fewer."),
  content: z
    .string()
    .trim()
    .min(1, "Please describe your inquiry.")
    .max(3000, "Message must be 3000 characters or fewer."),
});

export type InquiryValues = z.infer<typeof inquirySchema>;
