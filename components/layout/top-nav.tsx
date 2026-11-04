"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "@/assets/logo.webp";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

import { isTabActive, MAIN_TABS, MainTabLink } from "./main-tabs";

// 테두리는 화면 전체 폭, 내용은 페이지와 같은 폭(page-container)에 맞춤
const HEADER_CLASS = "h-(--topbar-h) shrink-0 border-b border-border";
const HEADER_INNER_CLASS = "page-container flex h-full items-center justify-between gap-4";

export function TopNav() {
  return <TopNavView pathname={usePathname()} />;
}

// usePathname이 서스펜드될 때(동적 경로 prerender) 보여줄, 활성 탭 없는 상단 바
export function TopNavFallback() {
  return <TopNavView pathname={null} />;
}

function TopNavView({ pathname }: { pathname: string | null }) {
  return (
    <header className={HEADER_CLASS}>
      <div className={HEADER_INNER_CLASS}>
        <Link href="/" aria-label="seoulmate home" className="shrink-0">
          <Image src={logo} alt="seoulmate" priority className="h-5 w-auto sm:h-6 md:h-7" />
        </Link>
        <div className="flex items-center gap-8">
          {/* 모바일에서는 하단 탭(BottomTabBar)이 대신한다 */}
          <nav aria-label="Main navigation" className="flex items-center gap-8 max-md:hidden">
            {MAIN_TABS.map(({ href, label }) => {
              const active = isTabActive(href, pathname);
              return (
                <MainTabLink
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    active ? "text-coral-dark" : "text-[#85858c] hover:text-coral-dark",
                  )}
                >
                  {label}
                </MainTabLink>
              );
            })}
          </nav>
          <ProfileButton />
        </div>
      </div>
    </header>
  );
}

function ProfileButton() {
  const { user, openLogin } = useAuth();
  const circle =
    "grid size-9 place-items-center rounded-full bg-coral-soft text-sm font-bold text-coral-dark";

  if (user === undefined) return <span className={circle} aria-hidden />;
  if (user === null) {
    return (
      <button
        type="button"
        onClick={() => {
          // 홈에서 로그인하면 기본 경로(/chats)로, 그 외 공개 페이지에서는 보던 페이지로 돌아온다
          const { pathname, search } = window.location;
          openLogin(pathname === "/" ? undefined : pathname + search);
        }}
        className="rounded-full bg-coral px-3 py-2 text-xs font-bold sm:px-4 text-white transition-colors hover:bg-coral-dark"
      >
        Log in
      </button>
    );
  }
  return (
    <Link href="/settings" title="My page" className={circle}>
      {(user.email ?? "?").slice(0, 1).toUpperCase()}
    </Link>
  );
}
