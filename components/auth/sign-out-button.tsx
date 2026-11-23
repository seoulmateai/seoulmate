"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signOutInThisTab } from "@/lib/auth/sign-out";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await signOutInThisTab();
    // 전체 새로고침: cacheComponents가 숨겨 보관한 이전 화면(로그인 상태의 채팅방 등)과
    // 라우터 캐시를 비운다. 클라이언트 이동이면 로그아웃 후에도 이전 대화가 다시 보인다
    window.location.replace("/");
  }

  return (
    <Button
      variant="outline"
      size="lg"
      className="h-12 w-full rounded-[11px] text-sm font-semibold hover:border-coral/40 hover:text-coral"
      disabled={pending}
      onClick={signOut}
    >
      Log out
    </Button>
  );
}
