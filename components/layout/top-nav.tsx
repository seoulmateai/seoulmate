"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

import { isTabActive, MAIN_TABS, MainTabLink } from "./main-tabs";
import { Wordmark } from "./wordmark";

const HEADER_CLASS = "h-(--topbar-h) shrink-0 border-b border-white/6";
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
          <Wordmark />
        </Link>
        <div className="flex items-center gap-6 md:gap-8">
          {/* 모바일에서는 하단 탭(BottomTabBar)이 대신한다 */}
          <nav aria-label="Main navigation" className="flex items-center gap-7 max-md:hidden">
            {MAIN_TABS.map(({ href, label }) => {
              const active = isTabActive(href, pathname);
              return (
                <MainTabLink
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    active ? "text-coral" : "text-muted-foreground hover:text-white",
                  )}
                >
                  {label}
                </MainTabLink>
              );
            })}
          </nav>
          <Link
            href="/#characters"
            className="btn-gradient inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-xs font-bold transition-[filter] hover:brightness-110 sm:h-10 sm:px-4 sm:text-sm"
          >
            Start chatting
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <ProfileButton />
        </div>
      </div>
    </header>
  );
}

function ProfileButton() {
  const { user, openLogin } = useAuth();
  const ring = "story-ring grid size-9 place-items-center rounded-full p-0.5 max-sm:hidden";

  if (user === undefined) return <span className={ring} aria-hidden />;
  if (user === null) {
    return (
      <button
        type="button"
        aria-label="Log in"
        onClick={() => {
          // 홈에서 로그인하면 기본 경로(/chats)로, 그 외 공개 페이지에서는 보던 페이지로 돌아온다
          const { pathname, search } = window.location;
          openLogin(pathname === "/" ? undefined : pathname + search);
        }}
        className={cn(ring, "cursor-pointer")}
      >
        <span className="size-full rounded-full border border-coral/50 bg-background" />
      </button>
    );
  }
  return (
    <Link href="/settings" title="My page" aria-label="My page" className={ring}>
      <span className="grid size-full place-items-center rounded-full bg-[#1a1020] text-sm font-bold text-white">
        {(user.email ?? "?").slice(0, 1).toUpperCase()}
      </span>
    </Link>
  );
}
