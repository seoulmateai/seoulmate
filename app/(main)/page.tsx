import { CharacterGrid } from "@/components/discover/character-grid";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCharacters } from "@/lib/characters";

const STEPS = [
  {
    n: "01",
    title: "Pick someone",
    body: "Browse the people on this page and choose a face.",
  },
  {
    n: "02",
    title: "Read their profile",
    body: "See their story and the words that describe them.",
  },
  {
    n: "03",
    title: "Start the chat",
    body: "Open a private conversation and keep going from there.",
  },
];

export default async function HomePage() {
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
  const popular = characters.filter((c) => c.badge === "popular").length;
  const fresh = characters.filter((c) => c.badge === "new").length;
  const stats = [
    { value: characters.length, label: "Characters" },
    { value: popular, label: "Popular" },
    { value: fresh, label: "New faces" },
  ];

  return (
    <div className="page-container flex flex-col pt-8 pb-10 md:pt-12 md:pb-14 min-[1050px]:pt-16 min-[1050px]:pb-18">
      <section className="mb-8 max-w-2xl md:mb-10">
        <p className="mb-3 text-xs font-extrabold tracking-[2px] text-coral uppercase">
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
        <a
          href="#characters"
          className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-coral px-6 text-sm font-bold text-white transition-colors hover:bg-coral-dark"
        >
          Browse characters
        </a>
      </section>

      <dl className="mb-12 grid grid-cols-3 divide-x divide-border border-y border-border">
        {stats.map(({ value, label }) => (
          <div key={label} className="px-2 py-5 first:pl-0 md:px-6">
            <dd className="text-[clamp(28px,3vw,40px)] leading-none font-extrabold tracking-[-1px]">
              {value}
            </dd>
            <dt className="mt-2 text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      <CharacterGrid characters={cards} />

      <section className="mt-14" aria-label="How to start">
        <p className="mb-2 text-xs font-extrabold tracking-[2px] text-coral uppercase">How to start</p>
        <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.6px]">Choose someone and say hello</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map(({ n, title, body }) => (
            <li key={n} className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-xs font-extrabold tracking-[1.5px] text-coral">{n}</p>
              <h3 className="mb-1.5 text-[15px] font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <SiteFooter className="mt-12" />
    </div>
  );
}
