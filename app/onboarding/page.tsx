import { redirect } from "next/navigation";
import { Suspense } from "react";

import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";

import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-6 pt-12 pb-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Nice to meet you!</h1>
        <p className="text-sm text-muted-foreground">
          Tell us a little about yourself before your story begins.
        </p>
      </header>
      <Suspense>
        <OnboardingGate searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// 세션·프로필 확인은 요청 시점 데이터라 Suspense 안에서 처리
async function OnboardingGate({ searchParams }: Pick<PageProps<"/onboarding">, "searchParams">) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(typeof rawNext === "string" ? rawNext : null);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) redirect(next);

  return <OnboardingForm next={next} />;
}
