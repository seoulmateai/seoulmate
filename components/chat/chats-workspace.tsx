"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// 왼쪽 대화 목록 + 오른쪽 채팅방.
// 모바일에서는 한 번에 하나만: /chats면 목록, /chats/[characterId]면 채팅방.
// (cacheComponents의 Activity가 이전 화면 DOM을 숨긴 채 남겨두므로 DOM이 아닌 URL로 판단)
export function ChatsWorkspace({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const roomOpen = usePathname() !== "/chats";

  return (
    <div className="page-container grid h-[calc(100dvh-var(--topbar-h))] min-h-[520px] grid-rows-[minmax(0,1fr)] max-md:px-0 md:grid-cols-[280px_minmax(0,1fr)] md:gap-3 md:py-3 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-4.5 lg:py-4.5">
      <aside
        className={cn(
          "flex min-h-0 flex-col overflow-hidden bg-white md:rounded-[20px] md:border md:border-[#f0f0f1]",
          roomOpen && "max-md:hidden",
        )}
      >
        {sidebar}
      </aside>
      <section
        aria-label="Conversation"
        className={cn(
          "flex min-h-0 flex-col overflow-hidden bg-chat md:rounded-[20px] md:border md:border-[#f0f0f1]",
          !roomOpen && "max-md:hidden",
        )}
      >
        {children}
      </section>
    </div>
  );
}
