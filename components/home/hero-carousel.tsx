"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import type { CharacterCard } from "@/components/discover/character-grid";
import { cn } from "@/lib/utils";

export function HomeHero({ characters }: { characters: CharacterCard[] }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  // Featured (popular) character goes first so the hero opens on them without a scroll jump.
  const featuredIndex = Math.max(
    0,
    characters.findIndex((character) => character.badge === "popular"),
  );
  const slides =
    characters.length > 0
      ? [characters[featuredIndex], ...characters.filter((_, i) => i !== featuredIndex)]
      : [];
  const current = slides[active] ?? null;
  const count = characters.length;
  const onlineLabel =
    count === 1 ? "1 boyfriend online now" : `${count} boyfriends online now`;

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.min(Math.max(index, 0), slides.length - 1);
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

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
        {current && (
          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            <span className="text-coral" aria-hidden>
              ★★★★★
            </span>{" "}
            <span className="italic">&ldquo;{current.bio}&rdquo;</span>
          </p>
        )}
      </div>

      {slides.length > 0 && (
        <div className="relative mx-auto w-full max-w-[420px]">
          <ul
            ref={scrollerRef}
            onScroll={handleScroll}
            aria-label="Featured characters"
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[28px] border border-coral/40 shadow-[0_0_90px_rgb(255_75_149/0.22)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {slides.map((character, i) => (
              <li key={character.id} className="w-full shrink-0 snap-center">
                <Link
                  href={`/characters/${character.id}`}
                  className="relative block aspect-[3/4] w-full overflow-hidden"
                >
                  <Image
                    src={character.avatar.src}
                    alt={`Portrait of ${character.name}`}
                    fill
                    priority={i === 0}
                    placeholder={character.avatar.blurDataURL ? "blur" : "empty"}
                    blurDataURL={character.avatar.blurDataURL ?? undefined}
                    sizes="(max-width: 768px) 100vw, 420px"
                    className="object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black via-black/15 to-black/20" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-2xl font-bold tracking-[-0.03em]">
                      {character.name}, {character.age}
                    </p>
                    <p className="mt-1 text-sm text-white/80">{character.occupation}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous character"
                onClick={() => goTo(active - 1)}
                disabled={active === 0}
                className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-opacity hover:bg-black/60 disabled:pointer-events-none disabled:opacity-0 md:flex"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next character"
                onClick={() => goTo(active + 1)}
                disabled={active === slides.length - 1}
                className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-opacity hover:bg-black/60 disabled:pointer-events-none disabled:opacity-0 md:flex"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
              <div className="mt-4 flex justify-center gap-2">
                {slides.map((character, i) => (
                  <button
                    key={character.id}
                    type="button"
                    aria-label={`Show ${character.name}`}
                    aria-current={i === active}
                    onClick={() => goTo(i)}
                    className={cn(
                      "h-1.5 cursor-pointer rounded-full transition-all",
                      i === active ? "w-6 bg-coral" : "w-1.5 bg-white/30 hover:bg-white/50",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
