"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isTabActive, MAIN_TABS, MainTabLink } from "./main-tabs";

// 모바일 전용 하단 탭. md 이상에서는 상단 바의 메뉴(TopNav)가 대신한다.
// 화면 폭은 CSS로 구분: 서버 렌더 시점엔 JS로 폭을 알 수 없어 첫 화면이 깜빡이기 때문
export function BottomTabBar() {
  const pathname = usePathname();

  // 채팅방에서는 입력창이 화면 하단을 쓰므로 숨김 (목록으로는 채팅방의 뒤로가기 버튼으로 이동)
  if (pathname.startsWith("/chats/")) return null;

  return (
    <>
      {/* 탭이 떠 있어 레이아웃 공간을 차지하지 않으므로, 페이지 끝 콘텐츠가 가려지지 않게 자리를 비워 둔다.
          채팅 목록은 자체 스크롤 영역에서 여백을 주므로(ChatSidebarList) 제외 */}
      {pathname !== "/chats" && <div aria-hidden className="h-(--bottomtab-h) shrink-0 md:hidden" />}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-[calc(1.125rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex h-15 -translate-x-1/2 rounded-full border border-border bg-card p-1 shadow-[0_8px_24px_rgb(0_0_0/0.45)] md:hidden"
      >
        {MAIN_TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(href, pathname);
          return (
            <MainTabLink
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-18 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors",
                active ? "bg-coral-soft text-coral" : "text-muted-foreground",
              )}
            >
              <Icon aria-hidden className="size-5" strokeWidth={active ? 1.8 : 1.8} />
              {label}
            </MainTabLink>
          );
        })}
      </nav>
    </>
  );
}
