import "server-only";

import { athlete } from "./athlete";
import { hongdae } from "./hongdae";
import { idol } from "./idol";
import { officeWorker } from "./office-worker";
import type { Character, CharacterId } from "./types";

export type { Character, CharacterId } from "./types";

export const characters: Character[] = [officeWorker, idol, athlete, hongdae];

export function getCharacter(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}

export function isCharacterId(id: string): id is CharacterId {
  return characters.some((c) => c.id === id);
}
