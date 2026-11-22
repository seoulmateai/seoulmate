import { CharacterGrid, type CharacterCard } from "@/components/discover/character-grid";
import { ClosingBanner, HomeHero, SceneRow, TonightStories } from "@/components/home/landing";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCharacters } from "@/lib/characters";

export default async function HomePage() {
  const characters = await getCharacters();
  const cards: CharacterCard[] = characters.map(({ id, name, age, occupation, bio, badge, avatar }) => ({
    id,
    name,
    age,
    occupation,
    bio,
    badge,
    avatar,
  }));
  const featured = cards.find((character) => character.badge === "popular") ?? cards[0] ?? null;

  return (
    <div className="flex flex-col pb-8">
      <HomeHero featured={featured} count={cards.length} />
      <TonightStories characters={cards} />
      <div className="page-container pt-4 pb-8">
        <CharacterGrid characters={cards} />
        <SceneRow characters={cards} />
        <ClosingBanner />
        <SiteFooter className="mt-8 justify-center border-0 text-center" />
      </div>
    </div>
  );
}
