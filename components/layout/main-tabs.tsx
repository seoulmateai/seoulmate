"use client";

import { House, MessageCircle, UserRound } from "lucide-react";
import Link from "next/link";

import { AuthGatedLink } from "@/components/auth/auth-gated-link";

// 상단 바(PC)와 하단 탭(모바일)이 함께 쓰는 메뉴
export const MAIN_TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/settings", label: "My page", icon: UserRound },
] as const;

export function isTabActive(href: string, pathname: string | null) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Home만 공개, 나머지는 로그인이 필요한 화면
export function MainTabLink({
  href,
  ...props
}: React.ComponentProps<typeof Link> & { href: string }) {
  return href === "/" ? <Link href={href} {...props} /> : <AuthGatedLink href={href} {...props} />;
}
