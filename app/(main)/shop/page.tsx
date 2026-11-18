import { Gem } from "lucide-react";

import { BuyPackButton } from "@/components/billing/buy-pack-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { RUBY_PACK_PRICES_USD, RUBY_PACKS } from "@/lib/billing/pricing";

// 루비 상점. 결제는 Polar(USD), 지급은 결제 완료 webhook 기준
// 로그인 확인은 proxy(PROTECTED_PATHS), 온보딩 확인은 체크아웃 API에서
export default function ShopPage() {
  return (
    <div className="page-container flex flex-1 flex-col pt-8 pb-6 md:pt-10 min-[850px]:pt-14">
      <section className="mb-6 md:mb-7.5">
        <p className="mb-2.5 text-[11px] font-extrabold tracking-[2px] text-coral">RUBY SHOP</p>
        <h1 className="mb-2 text-[32px] leading-[1.15] font-bold tracking-[-1.5px] md:text-[38px]">
          Get rubies
        </h1>
        <p className="text-xs text-muted-foreground md:text-sm">Rubies are used as you chat.</p>
      </section>

      <ul className="grid gap-3 sm:grid-cols-3">
        {RUBY_PACKS.map((pack) => (
          <li
            key={pack}
            className="flex flex-col gap-4 rounded-[18px] border border-border bg-card p-5 text-center"
          >
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-coral-soft text-coral">
              <Gem className="size-6" aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-extrabold">{pack}</p>
              <p className="text-xs text-muted-foreground">rubies</p>
            </div>
            <div className="mt-auto">
              <BuyPackButton pack={pack} label={RUBY_PACK_PRICES_USD[pack]} />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
        Prices are in USD and your card may charge a foreign transaction fee. Payments are processed
        by Polar, our merchant of record. Purchased rubies don&apos;t expire, but are removed if you
        delete your account.
      </p>

      <SiteFooter className="mt-12 md:mt-16" />
    </div>
  );
}
