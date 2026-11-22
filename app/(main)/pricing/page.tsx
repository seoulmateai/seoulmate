import { Check, Lock, Minus, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthGatedLink } from "@/components/auth/auth-gated-link";

export const metadata: Metadata = {
  title: "Pricing · seoulmate",
  description: "Seoulmate plans. Prices are placeholders and checkout is not open yet.",
};

const FREE = [
  { ok: true, label: "Daily free rubies" },
  { ok: true, label: "All characters" },
  { ok: true, label: "Scenes you unlock in chat" },
  { ok: false, label: "Higher daily limit" },
  { ok: false, label: "New characters first" },
];

const ANNUAL = [
  "Higher daily limit",
  "Every scene you unlock",
  "Photos in chat",
  "New characters first",
];

const MONTHLY = ["Higher daily limit", "Every scene you unlock", "Photos in chat"];

export default function PricingPage() {
  return (
    <div className="page-container flex flex-col items-center pt-12 pb-16 md:pt-16">
      <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-coral uppercase">Seoulmate+</p>
      <h1 className="text-center text-[clamp(36px,5vw,56px)] leading-none font-extrabold tracking-[-0.045em]">
        Don&apos;t let the <span className="font-script font-normal text-coral">story end.</span>
      </h1>
      <p className="mt-4 max-w-md text-center text-sm text-muted-foreground">
        A preview of the plans. Checkout is not open yet.
      </p>

      <div className="mt-10 grid w-full max-w-5xl items-stretch gap-4 md:grid-cols-3">
        <Plan name="Free" price="$0" note="Meet them. See if it clicks." current>
          <FeatureList items={FREE} />
          <span className="mt-6 flex h-12 items-center justify-center rounded-full border border-white/15 text-sm font-bold text-white/80">
            Current plan
          </span>
        </Plan>

        <Plan
          name="Annual"
          price="$4.99"
          unit="/ month"
          note="$59.88 billed once a year · save 50%"
          highlight
          badge="Best value"
        >
          <FeatureList items={ANNUAL.map((label) => ({ ok: true, label }))} />
          <AuthGatedLink
            href="/settings/inquiry"
            className="btn-gradient mt-6 flex h-12 items-center justify-center rounded-full text-sm font-bold transition-[filter] hover:brightness-110"
          >
            Start Annual
          </AuthGatedLink>
        </Plan>

        <Plan name="Monthly" price="$9.99" unit="/ month" note="Billed monthly · cancel anytime">
          <FeatureList items={MONTHLY.map((label) => ({ ok: true, label }))} />
          <AuthGatedLink
            href="/settings/inquiry"
            className="mt-6 flex h-12 items-center justify-center rounded-full border border-white/15 text-sm font-bold transition-colors hover:bg-white/5"
          >
            Start Monthly
          </AuthGatedLink>
        </Plan>
      </div>

      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <li className="inline-flex items-center gap-1.5">
          <Lock className="size-3.5" aria-hidden /> Discreet billing
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Shield className="size-3.5" aria-hidden /> Secure checkout
        </li>
      </ul>
      <p className="mt-6 max-w-xl text-center text-[11px] leading-relaxed text-muted-foreground">
        Prices shown are placeholders. Checkout is not open yet — Start Annual and Start Monthly
        open Contact us. You must be 18+ to use seoulmate.
      </p>
      <Link href="/" className="mt-6 text-sm font-semibold text-coral hover:underline">
        Back to Home
      </Link>
    </div>
  );
}

function Plan({
  name,
  price,
  unit,
  note,
  badge,
  highlight,
  current,
  children,
}: {
  name: string;
  price: string;
  unit?: string;
  note: string;
  badge?: string;
  highlight?: boolean;
  current?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        highlight
          ? "flex flex-col rounded-[24px] border border-coral/70 bg-[#160e18] p-6 shadow-[0_0_50px_rgb(255_75_149/0.18)]"
          : "flex flex-col rounded-[24px] border border-white/10 bg-card p-6"
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{name}</h2>
        {badge && (
          <span className="btn-gradient rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
            {badge}
          </span>
        )}
        {current && <span className="text-xs text-muted-foreground">Now</span>}
      </div>
      <p className="flex items-end gap-1">
        <span className="text-4xl font-extrabold tracking-[-0.04em]">{price}</span>
        {unit && <span className="mb-1 text-sm text-muted-foreground">{unit}</span>}
      </p>
      <p className="mt-3 border-b border-white/10 pb-4 text-sm text-muted-foreground">{note}</p>
      {children}
    </section>
  );
}

function FeatureList({ items }: { items: { ok: boolean; label: string }[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2.5 text-sm">
      {items.map((item) => (
        <li key={item.label} className={item.ok ? "flex items-center gap-2" : "flex items-center gap-2 text-white/35"}>
          {item.ok ? (
            <Check className="size-4 shrink-0 text-coral" aria-hidden />
          ) : (
            <Minus className="size-4 shrink-0" aria-hidden />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
