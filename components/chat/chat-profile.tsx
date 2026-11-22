import Link from "next/link";

import { EPISODE_COUNT } from "@/lib/affection/stages";
import type { ChatCharacter } from "@/lib/chat/types";

export function ChatProfile({
  character,
  unlockedStage,
}: {
  character: ChatCharacter;
  unlockedStage: number;
}) {
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-l border-white/8 bg-[#100d14] px-5 py-8 xl:flex">
      <h2 className="text-[28px] leading-none font-extrabold tracking-[-0.04em]">
        {character.name}{" "}
        {character.age != null && (
          <span className="text-lg font-medium text-white/50">{character.age}</span>
        )}
      </h2>
      {character.keywords && character.keywords.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {character.keywords.slice(0, 4).map((keyword) => (
            <li
              key={keyword}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/80"
            >
              {keyword}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm leading-relaxed text-white/70">{character.bio ?? character.occupation}</p>
      {character.bio && <p className="mt-2 text-xs text-muted-foreground">{character.occupation}</p>}
      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="font-semibold">Unlocked scenes</span>
        <span className="text-muted-foreground">
          {unlockedStage} / {EPISODE_COUNT}
        </span>
      </div>
      <Link href={`/characters/${character.id}`} className="mt-6 text-sm font-semibold text-coral hover:underline">
        Open profile
      </Link>
    </aside>
  );
}
