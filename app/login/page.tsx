import Link from "next/link";
import { Suspense } from "react";

import { Wordmark } from "@/components/layout/wordmark";
import { SLOGAN } from "@/lib/slogan";

import { LoginPageForm } from "./login-page-form";

// 보호 경로에 직접 접근했을 때 proxy.ts가 보내는 페이지 (앱 안에서는 로그인 모달을 사용)
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Link href="/">
          <Wordmark className="text-[28px]" />
        </Link>
        <p className="text-sm text-muted-foreground">{SLOGAN}</p>
      </div>
      <Suspense>
        <LoginPageForm />
      </Suspense>
    </main>
  );
}
