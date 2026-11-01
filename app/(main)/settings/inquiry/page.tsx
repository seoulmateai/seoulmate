import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ListTime } from "@/components/chat/local-time";
import { InquiryForm } from "@/components/settings/inquiry-form";
import { requireOnboardedUser } from "@/lib/auth/session";
import { INQUIRY_CATEGORIES } from "@/lib/validation/inquiry";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-muted text-muted-foreground",
  ANSWERED: "bg-primary/10 text-primary",
  CLOSED: "bg-muted text-muted-foreground",
};

export default function InquiryPage() {
  return (
    <div className="page-container flex flex-col gap-6 pt-6 pb-12 *:max-w-2xl md:pt-10">
      <header className="flex items-center gap-1">
        <Link
          href="/settings"
          aria-label="Back to My page"
          className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-muted"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="text-xl font-semibold">Contact us</h1>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <InquiryContent />
      </Suspense>
    </div>
  );
}

async function InquiryContent() {
  const { supabase, user } = await requireOnboardedUser("/settings/inquiry");

  // RLS: 본인 문의만 조회됨
  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("id, category, title, content, status, answer, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <InquiryForm defaultEmail={user.email ?? ""} />

      {inquiries && inquiries.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">My inquiries</h2>
          <ul className="flex flex-col gap-2">
            {inquiries.map((q) => (
              <li key={q.id}>
                <details className="group rounded-xl border px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2">
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        STATUS_STYLE[q.status],
                      )}
                    >
                      {q.status === "ANSWERED" ? "Answered" : q.status === "CLOSED" ? "Closed" : "Waiting"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{q.title}</span>
                    <ListTime iso={q.created_at} className="shrink-0 text-xs text-muted-foreground" />
                  </summary>
                  <div className="mt-3 flex flex-col gap-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {INQUIRY_CATEGORIES.find((c) => c.value === q.category)?.label}
                    </p>
                    <p className="whitespace-pre-wrap">{q.content}</p>
                    {q.answer && (
                      <div className="rounded-lg bg-primary/10 p-3">
                        <p className="mb-1 text-xs font-semibold text-primary">Answer</p>
                        <p className="whitespace-pre-wrap">{q.answer}</p>
                      </div>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
