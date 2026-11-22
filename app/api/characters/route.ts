import { NextResponse } from "next/server";

import { publicCharacter } from "@/lib/api/mobile";
import { getCharacters } from "@/lib/characters";

// 홈·탐색용 공개 목록. 프롬프트 칼럼은 getCharacters가 조회하지 않는다.
export async function GET() {
  try {
    const characters = await getCharacters();
    return NextResponse.json({ ok: true, characters: characters.map(publicCharacter) });
  } catch (e) {
    console.error("[characters] list failed", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
