import { CharacterGrid } from "@/components/discover/character-grid";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCharacters } from "@/lib/characters";

export default async function DiscoverPage() {
  // 모든 사용자 공통 데이터 → 공유 캐시('use cache'). 카드에 필요한 필드만 전달
  const characters = await getCharacters();
  const cards = characters.map(({ id, name, age, occupation, bio, badge, avatar }) => ({
    id,
    name,
    age,
    occupation,
    bio,
    badge,
    avatar,
  }));

  return (
    <div className="page-container flex flex-col pt-8 pb-10 md:pt-11 md:pb-14 min-[1050px]:pt-14 min-[1050px]:pb-18">
      <section className="mb-7 flex flex-col gap-3.5 md:mb-8.5 md:flex-row md:items-end md:justify-between md:gap-7">
        <div>
          <p className="mb-3 text-xs font-extrabold tracking-[2px] text-coral-dark uppercase">
            Your Seoul story starts here
          </p>
          <h1 className="mb-3 text-[clamp(32px,3.2vw,46px)] leading-[1.12] font-extrabold tracking-[-2px]">
            Who will you meet
            <br />
            in Seoul today?
          </h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Every encounter has a story. Find someone who makes yours unforgettable.
          </p>
        </div>
        <p className="pb-1 text-[13px] whitespace-nowrap text-[#999aa1]">
          ✦ &nbsp;{characters.length} people are waiting to meet you
        </p>
      </section>

      <CharacterGrid characters={cards} />

      <SiteFooter className="mt-7" />
    </div>
  );
}
