"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
type Values = z.infer<typeof schema>;

type Mode = "login" | "signup";

function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function signInWithGoogle() {
    setError(null);
    setGoogleLoading(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    });
    // 성공하면 Google로 페이지가 이동하므로 실패한 경우만 처리
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  async function onSubmit({ email, password }: Values) {
    setError(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          error.code === "email_not_confirmed"
            ? "Please verify your email first. Check your inbox."
            : "Invalid email or password.",
        );
        return;
      }
      // 프로필 유무에 따라 /onboarding 또는 next로 (서버에서 판단)
      window.location.assign(callbackUrl(next));
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl(next) },
    });
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      // 이메일 인증이 꺼져 있는 프로젝트라면 바로 로그인됨
      window.location.assign(callbackUrl(next));
      return;
    }
    setCheckEmail(email);
  }

  function switchMode(to: Mode) {
    setMode(to);
    setError(null);
    form.clearErrors();
  }

  if (checkEmail) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm">
          We sent a verification link to <span className="font-semibold">{checkEmail}</span>.
          <br />
          Click the link in the email to finish signing up.
        </p>
        <Button variant="outline" size="lg" onClick={() => setCheckEmail(null)}>
          Back
        </Button>
      </div>
    );
  }

  const busy = isSubmitting || googleLoading;

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full"
        disabled={busy}
        onClick={signInWithGoogle}
      >
        {googleLoading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-10"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "signup" ? "At least 8 characters" : undefined}
            className="h-10"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={busy}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {mode === "login" ? "Log in" : "Sign up"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? "New to seoulmate? " : "Already have an account? "}
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => switchMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </button>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
