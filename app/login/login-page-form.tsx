"use client";

import { useSearchParams } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { safeNextPath } from "@/lib/auth/next-path";

export function LoginPageForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const failed = searchParams.get("error") === "auth_callback_failed";

  return (
    <div className="flex flex-col gap-4">
      {failed && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Login failed or the link has expired. Please try again.
        </p>
      )}
      <AuthForm next={next} />
    </div>
  );
}
