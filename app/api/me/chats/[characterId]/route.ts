import { NextResponse } from "next/server";

import { requireOnboarded } from "@/lib/api/mobile";
import { toRelationshipView } from "@/lib/affection/stages";
import { getWallet } from "@/lib/billing/wallet";
import { getCharacter, getCharacterPersona } from "@/lib/characters";
import { MESSAGE_PAGE_SIZE } from "@/lib/chat/constants";
import { getOrCreateRoomId } from "@/lib/chat/server";
import { MESSAGE_COLUMNS, type ChatMessage } from "@/lib/chat/types";
import { createAdminClient } from "@/lib/supabase/admin";

// 채팅방 열기. 없으면 만들고, 최근 메시지·지갑·호감도만 반환한다.
// 에피소드 대본은 서버에서 다음 단계 번호를 계산하는 데만 쓰고 응답에 넣지 않는다.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/me/chats/[characterId]">,
) {
  const auth = await requireOnboarded(request);
  if ("error" in auth) return auth.error;

  const { characterId } = await ctx.params;
  const character = await getCharacter(characterId);
  if (!character) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let roomId: number | null;
  try {
    roomId = await getOrCreateRoomId(auth.user.id, character);
  } catch (e) {
    console.error("[me/chats] create room failed", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
  if (roomId == null) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const admin = createAdminClient();
  let wallet;
  try {
    const [{ data: rows, error: messageError }, nextWallet, roomResult, persona] =
      await Promise.all([
        auth.supabase
          .from("messages")
          .select(MESSAGE_COLUMNS)
          .eq("room_id", roomId)
          .order("id", { ascending: false })
          .limit(MESSAGE_PAGE_SIZE + 1),
        getWallet(admin, auth.user.id),
        auth.supabase
          .from("chat_rooms")
          .select("affection, unlocked_stage, played_stage")
          .eq("id", roomId)
          .maybeSingle(),
        getCharacterPersona(character.id),
      ]);
    wallet = nextWallet;
    if (messageError || roomResult.error) {
      console.error("[me/chats] room load failed", messageError ?? roomResult.error);
      return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
    }

    const latest = (rows ?? []) as ChatMessage[];
    const relationship = toRelationshipView(
      {
        affection: roomResult.data?.affection ?? 0,
        unlockedStage: roomResult.data?.unlocked_stage ?? 0,
        playedStage: roomResult.data?.played_stage ?? 0,
      },
      persona?.episodes ?? [],
    );

    return NextResponse.json({
      ok: true,
      roomId,
      character: {
        id: character.id,
        name: character.name,
        occupation: character.occupation,
        avatarUrl: character.avatar.src,
        isActive: character.isActive,
      },
      messages: latest.slice(0, MESSAGE_PAGE_SIZE).reverse(),
      hasMore: latest.length > MESSAGE_PAGE_SIZE,
      wallet,
      relationship,
    });
  } catch (e) {
    console.error("[me/chats] room load failed", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
