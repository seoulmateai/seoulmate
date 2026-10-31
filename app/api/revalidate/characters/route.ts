import { timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { CHARACTERS_TAG } from "@/lib/characters";

// Supabase Database Webhook (characters INSERT/UPDATE/DELETE) → 캐릭터 캐시 무효화.
// 대시보드에서 캐릭터를 수정하면 바로 반영되도록 한다.
// Webhook 설정: HTTP Header에 x-revalidate-secret: <CHARACTERS_REVALIDATE_SECRET>
export async function POST(request: Request) {
  const secret = process.env.CHARACTERS_REVALIDATE_SECRET;
  if (!secret) {
    console.error("[revalidate] CHARACTERS_REVALIDATE_SECRET is not set");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const given = Buffer.from(request.headers.get("x-revalidate-secret") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 프롬프트 변경이 다음 채팅부터 바로 적용되도록 stale 없이 즉시 만료
  revalidateTag(CHARACTERS_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
