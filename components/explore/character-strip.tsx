import Image from "next/image";
import Link from "next/link";

import type { CharacterAvatar } from "@/lib/characters/types";
import { cn } from "@/lib/utils";

export type StripCharacter = {
  id: string;
  name: string;
  avatar: CharacterAvatar;
  hasPosts: boolean;
};

export function CharacterStrip({ characters }: { characters: StripCharacter[] }) {
  return (
    <ul className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {characters.map((character) => (
        <li key={character.id} className="w-18 shrink-0">
          <Link
            href={`/explore/${character.id}`}
            className="flex flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                "rounded-full p-0.5",
                character.hasPosts ? "story-ring" : "bg-border",
              )}
            >
              <span className="block rounded-full bg-background p-0.5">
                <span className="relative block size-16 overflow-hidden rounded-full bg-muted">
                  <Image
                    src={character.avatar.src}
                    alt=""
                    fill
                    placeholder={character.avatar.blurDataURL ? "blur" : "empty"}
                    blurDataURL={character.avatar.blurDataURL ?? undefined}
                    sizes="64px"
                    className="object-cover object-top"
                  />
                </span>
              </span>
            </span>
            <span className="w-full truncate text-center text-xs text-foreground">
              {character.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
