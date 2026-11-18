import type { Database } from "@/lib/supabase/database.types";

type Tx = Pick<
  Database["public"]["Tables"]["ruby_transactions"]["Row"],
  "id" | "type" | "paid_delta" | "free_delta" | "created_at"
>;

const LABEL: Record<string, string> = {
  PURCHASE: "Purchased",
  USAGE: "Used in chat",
  REFUND: "Refunded",
  ADMIN: "Added by seoulmate",
};

// 서버에서 렌더링하므로 시간대를 KST로 고정 (서비스 기준 시간대)
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** 최근 루비 충전·사용 내역. 높이 고정, 넘치는 내역은 안에서 스크롤 */
export function RubyHistory({ transactions }: { transactions: Tx[] }) {
  return (
    <section className="flex h-[300px] flex-col rounded-[18px] border border-border bg-card p-5 md:p-6">
      <h2 className="mb-3 shrink-0 text-[15px] font-bold">Recent ruby activity</h2>
      {transactions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="-mr-2 min-h-0 flex-1 divide-y divide-border overflow-y-auto pr-2">
          {transactions.map((t) => {
            const delta = t.paid_delta + t.free_delta;
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  {LABEL[t.type] ?? t.type}
                  {t.type === "USAGE" && t.free_delta !== 0 && t.paid_delta === 0 && (
                    <span className="ml-1.5 text-[11px] text-muted-foreground">free</span>
                  )}
                  <small className="mt-0.5 block text-[11px] text-muted-foreground">
                    <time dateTime={t.created_at}>{dateFormat.format(new Date(t.created_at))}</time>
                  </small>
                </span>
                <span className={delta > 0 ? "font-bold text-coral" : "font-bold text-muted-foreground"}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
