"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { CharacterAvatar, CharacterBadge } from "@/lib/characters/types";
import { cn } from "@/lib/utils";

export type CharacterCard = {
  id: string;
  name: string;
  age: number;
  occupation: string;
  bio: string;
  badge: CharacterBadge;
  avatar: CharacterAvatar;
};

type Filter = "all" | CharacterBadge;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "popular", label: "Popular" },
  { value: "new", label: "New faces" },
];

const BADGE_LABEL: Record<CharacterBadge, string> = {
  popular: "POPULAR",
  new: "NEW FACE",
};

export function CharacterGrid({ characters }: { characters: CharacterCard[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = characters.filter((c) => filter === "all" || c.badge === filter);

  return (
    <section id="characters" aria-label="Characters" className="scroll-mt-24">
      <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold tracking-[2px] text-coral uppercase">Featured</p>
          <h2 className="text-2xl font-extrabold tracking-[-0.6px]">Meet your Seoulmates</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Tap a card to open the full profile.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-2.5 text-xs transition-colors",
                filter === value
                  ? "border-coral/40 bg-coral-soft font-bold text-coral"
                  : "border-border bg-card text-muted-foreground hover:text-coral",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:gap-5 min-[1050px]:grid-cols-4">
        {visible.map((character, i) => (
          <li key={character.id}>
            <Link
              href={`/characters/${character.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[transform,border-color] duration-250 hover:-translate-y-1.5 hover:border-coral/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <div className="relative aspect-[3/4] bg-muted">
                <Image
                  src={character.avatar.src}
                  alt={`Portrait of ${character.name}`}
                  fill
                  priority={i < 4}
                  placeholder={character.avatar.blurDataURL ? "blur" : "empty"}
                  blurDataURL={character.avatar.blurDataURL ?? undefined}
                  sizes="(max-width: 1050px) 50vw, 280px"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span className="absolute top-2.5 left-2.5 rounded-full bg-black/65 px-2.5 py-1.5 text-[9px] font-bold tracking-[0.3px] text-white backdrop-blur-sm md:top-3.5 md:left-3.5 md:text-[10px]">
                  {BADGE_LABEL[character.badge]}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3.5 md:p-4">
                <p className="flex items-baseline gap-2">
                  <span className="text-[17px] font-extrabold tracking-[-0.4px] md:text-xl">
                    {character.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground md:text-[13px]">
                    {character.age}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground md:text-[13px]">
                  {character.occupation}
                </p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-foreground/75">
                  {character.bio}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
