"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isTabActive, MAIN_TABS, MainTabLink } from "./main-tabs";

// 모바일 전용 하단 탭. md 이상에서는 상단 바의 메뉴(TopNav)가 대신한다.
export function BottomTabBar() {
  const pathname = usePathname();

  // 채팅방에서는 입력창이 화면 하단을 쓰므로 숨김 (목록으로는 채팅방의 뒤로가기 버튼으로 이동)
  if (pathname.startsWith("/chats/")) return null;

  return (
    <>
      {/* 탭이 고정이라 레이아웃 공간을 차지하지 않으므로, 페이지 끝 콘텐츠가 가려지지 않게 자리를 비워 둔다.
          채팅 목록은 자체 스크롤 영역에서 여백을 주므로(ChatSidebarList) 제외 */}
      {pathname !== "/chats" && <div aria-hidden className="h-(--bottomtab-h) shrink-0 md:hidden" />}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid h-(--bottomtab-h) grid-cols-4 border-t border-white/8 bg-[#0c0b10]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {MAIN_TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(href, pathname);
          return (
            <MainTabLink
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                active ? "text-coral" : "text-muted-foreground",
              )}
            >
              <Icon aria-hidden className="size-5" strokeWidth={active ? 2.2 : 1.7} />
              {label}
            </MainTabLink>
          );
        })}
      </nav>
    </>
  );
}
