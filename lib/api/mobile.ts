import { NextResponse } from "next/server";

import type { Character } from "@/lib/characters";
import { getRequestUser } from "@/lib/supabase/request";

/** 앱에 내려도 되는 캐릭터 카드. 프롬프트·에피소드 본문은 포함하지 않는다. */
export function publicCharacter(character: Character) {
  return {
    id: character.id,
    name: character.name,
    age: character.age,
    occupation: character.occupation,
    bio: character.bio,
    intro: character.intro,
    keywords: character.keywords,
    badge: character.badge,
    avatarUrl: character.avatar.src,
    isActive: character.isActive,
  };
}

export async function requireOnboarded(request: Request) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) {
    return {
      error: NextResponse.json({ ok: false as const, error: "UNAUTHENTICATED" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return {
      error: NextResponse.json(
        { ok: false as const, error: "ONBOARDING_REQUIRED" },
        { status: 403 },
      ),
    };
  }

  return { supabase, user, profile };
}
