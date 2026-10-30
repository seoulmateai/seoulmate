import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// 내용이 아직 없는 문서 페이지 (이용약관, 개인정보 처리방침)
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pt-6 pb-12 md:pt-10">
      <header className="flex items-center gap-1">
        <Link
          href="/settings"
          aria-label="Back"
          className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-muted"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
