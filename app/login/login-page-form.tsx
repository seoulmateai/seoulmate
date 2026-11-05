"use client";

import { useSearchParams } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { safeNextPath } from "@/lib/auth/next-path";

export function LoginPageForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const error = searchParams.get("error");
  const failed = error === "auth_callback_failed" || error === "demo_failed";

  return (
    <div className="flex flex-col gap-4">
      {failed && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error === "demo_failed"
            ? "Demo login failed. Check that the local Supabase keys are set, then try again."
            : "Login failed or the link has expired. Please try again."}
        </p>
      )}
      <AuthForm next={next} />
    </div>
  );
}
