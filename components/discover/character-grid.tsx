"use client";

import { ArrowRight } from "lucide-react";
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
  chatEnabled: boolean;
};

type Filter = "all" | CharacterBadge;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "popular", label: "Hot" },
  { value: "new", label: "New" },
];

export function CharacterGrid({ characters }: { characters: CharacterCard[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = characters.filter((c) => filter === "all" || c.badge === filter);

  return (
    <section id="characters" aria-label="Characters" className="scroll-mt-24">
      <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-coral uppercase">
            Choose your type
          </p>
          <h2 className="text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.04em]">
            Who are you texting tonight?
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                filter === value
                  ? "btn-gradient border-transparent"
                  : "border-white/15 bg-transparent text-white/70 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-sm text-muted-foreground">No one in this filter yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:gap-4 min-[1050px]:grid-cols-4">
          {visible.map((character, i) => (
            <li
              key={character.id}
              className="relative overflow-hidden rounded-[22px] border border-white/10 bg-card"
            >
              <Link
                href={`/characters/${character.id}`}
                className="group relative block aspect-[3/4.15] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
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
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent via-45% to-transparent md:from-black md:via-black/25 md:via-50% md:to-black/10" />
                <span
                  className={cn(
                    "absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide",
                    character.badge === "popular"
                      ? "bg-coral text-white"
                      : "border border-coral/70 bg-black/40 text-coral",
                  )}
                >
                  {character.badge === "popular" ? "HOT" : "NEW"}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-3 pb-12 md:p-4 md:pb-[4.5rem]">
                  <p className="text-[15px] font-extrabold tracking-[-0.03em] md:text-xl">
                    {character.name}, {character.age}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/70 md:text-xs">{character.occupation}</p>
                  <p className="mt-2 hidden font-script md:line-clamp-2 text-[13px] leading-snug text-white/85">
                    &ldquo;{character.bio}&rdquo;
                  </p>
                </div>
              </Link>
              {character.chatEnabled ? (
                <Link
                  href={`/chats/${character.id}`}
                  className="btn-gradient absolute inset-x-3 bottom-3 z-10 inline-flex h-8 items-center justify-center gap-1 rounded-full text-[11px] font-bold transition-[filter] hover:brightness-110 md:inset-x-4 md:bottom-4 md:h-10 md:text-sm"
                >
                  Chat now
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              ) : (
                <span
                  aria-disabled
                  className="absolute inset-x-3 bottom-3 z-10 inline-flex h-8 cursor-not-allowed items-center justify-center rounded-full border border-white/20 bg-black/50 text-[11px] font-bold text-white/60 backdrop-blur md:inset-x-4 md:bottom-4 md:h-10 md:text-sm"
                >
                  Coming soon
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
