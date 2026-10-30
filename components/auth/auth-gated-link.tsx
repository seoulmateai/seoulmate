"use client";

import Link from "next/link";

import { useAuth } from "./auth-provider";

// 로그인이 필요한 화면으로 가는 링크. 로그아웃 상태면 이동 대신 로그인 모달을 띄운다.
// (세션 확인 중이거나 JS가 없으면 그냥 이동 → proxy.ts가 /login으로 보냄)
export function AuthGatedLink({
  href,
  onClick,
  ...props
}: React.ComponentProps<typeof Link> & { href: string }) {
  const { user, openLogin } = useAuth();

  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (user === null) {
          e.preventDefault();
          openLogin(href);
        }
      }}
      {...props}
    />
  );
}
