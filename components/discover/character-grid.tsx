"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { CharacterBadge } from "@/lib/characters/types";
import { cn } from "@/lib/utils";

export type CharacterCard = {
  id: string;
  name: string;
  age: number;
  occupation: string;
  bio: string;
  badge: CharacterBadge;
  avatar: StaticImageData;
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
    <section aria-label="Characters">
      <div className="mb-4.5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[17px] font-bold">
          Meet your Seoulmates{" "}
          <span className="font-medium text-[#aaa]">
            · {String(characters.length).padStart(2, "0")}
          </span>
        </h2>
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
                  ? "border-[#ffd2ce] bg-coral-soft font-bold text-coral-dark"
                  : "border-[#e9e9ec] bg-white text-muted-foreground hover:text-coral-dark",
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
              className="group relative isolate block min-h-[310px] overflow-hidden rounded-[15px] bg-[#e9e9ec] transition-[transform,box-shadow] duration-250 hover:-translate-y-1.5 hover:shadow-[0_16px_35px_rgba(28,24,30,0.13)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-[430px] md:rounded-[19px]"
            >
              <Image
                src={character.avatar}
                alt={`Portrait of ${character.name}`}
                fill
                priority={i < 4}
                placeholder="blur"
                sizes="(max-width: 1050px) 50vw, 340px"
                className="-z-20 object-cover object-top transition-transform duration-500 group-hover:scale-[1.045]"
              />
              <div className="absolute inset-x-0 top-1/4 bottom-0 -z-10 bg-linear-to-b from-transparent via-[rgba(12,13,18,0.12)] via-32% to-[rgba(12,13,18,0.82)]" />
              <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[9px] font-bold tracking-[0.3px] text-[#55545b] backdrop-blur-sm md:top-4 md:left-4 md:text-[10px]">
                {BADGE_LABEL[character.badge]}
              </span>
              <div className="absolute right-3 bottom-3.5 left-3.5 text-white md:right-4.5 md:bottom-5 md:left-5">
                <p className="mb-1.5 flex items-baseline gap-2">
                  <span className="text-[19px] font-extrabold tracking-[-0.6px] md:text-2xl">
                    {character.name}
                  </span>
                  <span className="text-[11px] text-white/80 md:text-[13px]">{character.age}</span>
                </p>
                <p className="text-[11px] leading-normal text-white/90 md:text-[13px]">
                  {character.occupation}
                </p>
                <p className="mt-2.5 hidden text-xs leading-normal text-white/75 sm:block">
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
