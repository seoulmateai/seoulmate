import { NextResponse } from "next/server";

import { requireOnboarded } from "@/lib/api/mobile";
import { getCharactersByIds } from "@/lib/characters";

// 내 채팅 목록. 캐릭터 프롬프트는 합치지 않고 카드 필드만 붙인다.
export async function GET(request: Request) {
  const auth = await requireOnboarded(request);
  if ("error" in auth) return auth.error;

  const { data: rooms, error } = await auth.supabase
    .from("chat_rooms")
    .select("id, character_id, last_message_at, last_message_preview, created_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[me/chats] list failed", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }

  const characters = await getCharactersByIds((rooms ?? []).map((room) => room.character_id));
  const chats = (rooms ?? []).flatMap((room) => {
    const character = characters.get(room.character_id);
    if (!character) return [];
    return [
      {
        roomId: room.id,
        characterId: character.id,
        name: character.name,
        occupation: character.occupation,
        avatarUrl: character.avatar.src,
        isActive: character.isActive,
        lastMessageAt: room.last_message_at,
        preview: room.last_message_preview ?? `Say hi to ${character.name}!`,
      },
    ];
  });

  return NextResponse.json({ ok: true, chats });
}
