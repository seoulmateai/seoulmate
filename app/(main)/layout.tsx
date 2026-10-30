import { Suspense } from "react";

import { TopNav, TopNavFallback } from "@/components/layout/top-nav";

// 상단 바(Discover / Chats / My page)가 있는 화면들
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col bg-background shadow-[0_0_40px_rgba(25,25,35,0.045)] min-[1100px]:w-[calc(100%-64px)]">
      <Suspense fallback={<TopNavFallback />}>
        <TopNav />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
