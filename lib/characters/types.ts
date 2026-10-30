import type { StaticImageData } from "next/image";

// DB chat_rooms.character_slug CHECK 목록과 일치해야 함
export type CharacterId = "office-worker" | "idol" | "athlete" | "hongdae";

export type CharacterBadge = "popular" | "new";

export type Character = {
  id: CharacterId;
  name: string;
  age: number;
  /** 직업 · 동네 (카드·프로필에 표시) */
  occupation: string;
  /** 카드에 표시할 한 줄 소개 */
  bio: string;
  /** Discover 필터·카드 배지 */
  badge: CharacterBadge;
  avatar: StaticImageData;
  intro: string;
  keywords: string[];
  /** 프롬프트를 바꾸면 올려서 messages.persona_version / llm_calls에 기록 */
  personaVersion: number;
  systemPrompt: string;
};
