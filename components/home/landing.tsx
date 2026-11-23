import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { CharacterCard } from "@/components/discover/character-grid";

export function TonightStories({ characters }: { characters: CharacterCard[] }) {
  if (characters.length === 0) return null;

  return (
    <section className="page-container py-8" aria-label="Tonight's stories">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Tonight&apos;s stories</h2>
        <Link href="/explore" className="text-sm font-semibold text-coral hover:underline">
          See all →
        </Link>
      </div>
      <ul className="flex gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {characters.map((character) => (
          <li key={character.id} className="w-[76px] shrink-0">
            <Link href={`/explore/${character.id}`} className="flex flex-col items-center gap-2">
              <span className="story-ring rounded-full p-[2px]">
                <span className="block rounded-full bg-background p-[2px]">
                  <span className="relative block size-[68px] overflow-hidden rounded-full bg-muted">
                    <Image
                      src={character.avatar.src}
                      alt=""
                      fill
                      placeholder={character.avatar.blurDataURL ? "blur" : "empty"}
                      blurDataURL={character.avatar.blurDataURL ?? undefined}
                      sizes="68px"
                      className="object-cover object-top"
                    />
                  </span>
                </span>
              </span>
              <span className="w-full truncate text-center text-xs text-white/85">{character.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SceneRow({ characters }: { characters: CharacterCard[] }) {
  const scenes = characters.slice(0, 3);
  if (scenes.length === 0) return null;

  return (
    <section className="mt-16" aria-label="Scenes">
      <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-coral uppercase">Not just chat</p>
      <h2 className="mb-6 text-[clamp(28px,3vw,40px)] font-extrabold tracking-[-0.04em]">
        Your story has <span className="font-script font-normal text-coral">scenes.</span>
      </h2>
      <ul className="grid gap-3 md:grid-cols-3">
        {scenes.map((character) => (
          <li key={character.id}>
            <Link
              href={`/characters/${character.id}`}
              className="flex h-full flex-col gap-2 rounded-[22px] border border-white/10 bg-card px-5 py-5 transition-colors hover:border-coral/40"
            >
              <p className="text-[10px] font-bold tracking-[0.14em] text-coral uppercase">
                Scene · {character.name}
              </p>
              <h3 className="text-lg font-bold tracking-[-0.03em]">{character.occupation}</h3>
              <p className="font-script text-[15px] leading-relaxed text-white/75">
                &ldquo;{character.bio}&rdquo;
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ClosingBanner() {
  return (
    <section className="relative mt-14 overflow-hidden rounded-[28px] border border-white/8 bg-[#140910] px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(255_75_149/0.28),transparent_62%)]"
      />
      <h2 className="relative text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-0.04em]">
        He already saved your seat.
      </h2>
      <a
        href="#characters"
        className="btn-gradient relative mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-bold transition-[filter] hover:brightness-110"
      >
        Pick your Seoulmate
        <ArrowRight className="size-4" aria-hidden />
      </a>
    </section>
  );
}
