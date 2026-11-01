"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "@/assets/logo.webp";
import { AuthGatedLink } from "@/components/auth/auth-gated-link";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Discover" },
  { href: "/chats", label: "Chats" },
  { href: "/settings", label: "My page" },
] as const;

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
        <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-4 md:gap-8">
          {TABS.map(({ href, label }) => {
            const active =
              pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
            const className = cn(
              "text-xs font-semibold transition-colors md:text-sm",
              active ? "text-coral-dark" : "text-[#85858c] hover:text-coral-dark",
            );
            return href === "/" ? (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={className}>
                {label}
              </Link>
            ) : (
              <AuthGatedLink
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={className}
              >
                {label}
              </AuthGatedLink>
            );
          })}
          <ProfileButton />
        </nav>
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
        onClick={() => openLogin()}
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
