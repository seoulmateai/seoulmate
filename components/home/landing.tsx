import { ArrowRight, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { CharacterCard } from "@/components/discover/character-grid";

export function HomeHero({
  featured,
  count,
}: {
  featured: CharacterCard | null;
  count: number;
}) {
  const onlineLabel =
    count === 1 ? "1 boyfriend online now" : `${count} boyfriends online now`;

  return (
    <section className="page-container grid items-center gap-10 pt-8 pb-6 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.85fr)] md:pt-14 md:pb-10">
      <div>
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-white/80 uppercase">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
          {onlineLabel}
        </p>
        <h1 className="max-w-xl text-[clamp(40px,5vw,68px)] leading-[0.98] font-extrabold tracking-[-0.045em]">
          He&apos;s been
          <br />
          <span className="font-script font-normal text-coral">waiting</span> for you.
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {count === 4 ? "Four Korean men. Four stories." : `${count} stories.`} One of them already
          knows your name. Pick him, and the story starts tonight.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a
            href="#characters"
            className="btn-gradient inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-[filter] hover:brightness-110"
          >
            Meet him tonight
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <Link
            href="/explore"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Play className="size-3.5 fill-current" aria-hidden />
            Watch the scene
          </Link>
        </div>
        {featured && (
          <p className="mt-6 text-sm text-muted-foreground">
            <span className="text-coral" aria-hidden>
              ★★★★★
            </span>{" "}
            <span className="italic">&ldquo;{featured.bio}&rdquo;</span>
          </p>
        )}
      </div>

      {featured && (
        <Link
          href={`/characters/${featured.id}`}
          className="relative mx-auto block aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-[28px] border border-coral/40 shadow-[0_0_90px_rgb(255_75_149/0.22)]"
        >
          <Image
            src={featured.avatar.src}
            alt={`Portrait of ${featured.name}`}
            fill
            priority
            placeholder={featured.avatar.blurDataURL ? "blur" : "empty"}
            blurDataURL={featured.avatar.blurDataURL ?? undefined}
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/15 to-black/20" />
          <div className="absolute top-16 right-5 left-10 max-w-[240px] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-[13px] leading-snug text-neutral-900 shadow-lg sm:left-auto">
            <p className="mb-0.5 text-[11px] font-bold text-coral">{featured.name}</p>
            {featured.bio}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-2xl font-bold tracking-[-0.03em]">
              {featured.name}, {featured.age}
            </p>
            <p className="mt-1 text-sm text-white/80">{featured.occupation}</p>
          </div>
        </Link>
      )}
    </section>
  );
}

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
