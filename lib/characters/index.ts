import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

import type { Character, CharacterBadge, CharacterPersona } from "./types";

export type { Character, CharacterBadge, CharacterPersona } from "./types";

// 캐릭터는 모든 사용자에게 같은 데이터 → 'use cache'로 공유 캐시.
// 대시보드에서 수정하면 Supabase Webhook → /api/revalidate/characters 가 태그를 무효화한다.
// 캐시 함수에는 사용자 정보(userId 등)를 절대 넘기지 말 것.
// 'use cache' 안에서는 cookies()를 못 쓰므로 service role 클라이언트로 조회 (characters는 RLS로 서버 전용).
export const CHARACTERS_TAG = "characters";

const PUBLIC_COLUMNS =
  "id, name, age, occupation, bio, intro, keywords, badge, avatar_path, blur_data_url, is_active";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** URL 파라미터 등 외부 입력이 UUID인지 (아니면 DB 조회·캐시 없이 404) */
export function isCharacterId(id: string) {
  return UUID_RE.test(id);
}

type PublicRow = {
  id: string;
  name: string;
  age: number;
  occupation: string;
  bio: string;
  intro: string;
  keywords: string[];
  badge: string;
  avatar_path: string;
  blur_data_url: string | null;
  is_active: boolean;
};

function toCharacter(row: PublicRow): Character {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    occupation: row.occupation,
    bio: row.bio,
    intro: row.intro,
    keywords: row.keywords,
    badge: row.badge as CharacterBadge,
    avatar: { src: avatarUrl(row.avatar_path), blurDataURL: row.blur_data_url },
    isActive: row.is_active,
  };
}

function avatarUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) throw new Error("NEXT_PUBLIC_R2_PUBLIC_URL is not set");
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/** Discover에 노출할 캐릭터 (is_active, 정렬 순) */
export async function getCharacters(): Promise<Character[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CHARACTERS_TAG);

  const { data, error } = await createAdminClient()
    .from("characters")
    .select(PUBLIC_COLUMNS)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data.map(toCharacter);
}

/** 비활성 캐릭터도 반환 (기존 채팅방 표시용). 노출 여부는 호출하는 쪽에서 isActive로 판단 */
export async function getCharacter(id: string): Promise<Character | null> {
  if (!isCharacterId(id)) return null;
  return getCharacterCached(id.toLowerCase());
}

async function getCharacterCached(id: string): Promise<Character | null> {
  "use cache";
  cacheLife("days");
  cacheTag(CHARACTERS_TAG);

  const { data, error } = await createAdminClient()
    .from("characters")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toCharacter(data) : null;
}

/** 채팅 목록용: 여러 캐릭터를 id로 (비활성 포함) */
export async function getCharactersByIds(ids: string[]): Promise<Map<string, Character>> {
  const list = await Promise.all([...new Set(ids)].map(getCharacter));
  return new Map(list.flatMap((c) => (c ? [[c.id, c] as const] : [])));
}

/** 시스템 프롬프트 조립용. /api/chat 전용 — 반환값을 클라이언트로 넘기지 말 것 */
export async function getCharacterPersona(id: string): Promise<CharacterPersona | null> {
  if (!isCharacterId(id)) return null;
  return getCharacterPersonaCached(id.toLowerCase());
}

async function getCharacterPersonaCached(id: string): Promise<CharacterPersona | null> {
  "use cache";
  cacheLife("days");
  cacheTag(CHARACTERS_TAG);

  const { data, error } = await createAdminClient()
    .from("characters")
    .select(
      "id, name, age, background, personality, speech_style, extra_rules, persona_version, is_active",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    age: data.age,
    background: data.background,
    personality: data.personality,
    speechStyle: data.speech_style,
    extraRules: data.extra_rules,
    personaVersion: data.persona_version,
    isActive: data.is_active,
  };
}
