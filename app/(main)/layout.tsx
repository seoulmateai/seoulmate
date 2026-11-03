import { Suspense } from "react";

import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { TopNav, TopNavFallback } from "@/components/layout/top-nav";

// 메뉴(Home / Chats / My page)가 있는 화면들. PC는 상단 바, 모바일은 하단 탭
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <Suspense fallback={<TopNavFallback />}>
        <TopNav />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
      {/* 동적 경로 prerender 땐 채팅방 여부를 모르므로, 탭이 잠깐 비쳤다 사라지지 않게 그리지 않음 */}
      <Suspense>
        <BottomTabBar />
      </Suspense>
    </div>
  );
}
