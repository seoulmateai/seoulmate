import { NextResponse } from "next/server";

import { publicCharacter } from "@/lib/api/mobile";
import { getCharacter } from "@/lib/characters";

// 비활성 캐릭터도 반환한다. 기존 채팅방 프로필용. 새 대화 가능 여부는 isActive로 판단.
export async function GET(_request: Request, ctx: RouteContext<"/api/characters/[id]">) {
  const { id } = await ctx.params;
  try {
    const character = await getCharacter(id);
    if (!character) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true, character: publicCharacter(character) });
  } catch (e) {
    console.error("[characters] detail failed", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
