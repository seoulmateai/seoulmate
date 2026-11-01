import { Suspense } from "react";

import { TopNav, TopNavFallback } from "@/components/layout/top-nav";

// 상단 바(Discover / Chats / My page)가 있는 화면들
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <Suspense fallback={<TopNavFallback />}>
        <TopNav />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
