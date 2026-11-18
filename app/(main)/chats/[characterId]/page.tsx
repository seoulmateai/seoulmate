import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatRoom } from "@/components/chat/chat-room";
import { requireOnboardedUser } from "@/lib/auth/session";
import { toRelationshipView } from "@/lib/affection/stages";
import { getCharacter, getCharacterPersona, getCharacters } from "@/lib/characters";
import { MESSAGE_PAGE_SIZE } from "@/lib/chat/constants";
import { getWallet } from "@/lib/billing/wallet";
import { getOrCreateRoomId } from "@/lib/chat/server";
import { MESSAGE_COLUMNS, type ChatMessage } from "@/lib/chat/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function generateStaticParams() {
  const characters = await getCharacters();
  return characters.map((c) => ({ characterId: c.id }));
}

export default function ChatRoomPage({ params }: PageProps<"/chats/[characterId]">) {
  return (
    <Suspense fallback={<div className="flex-1 bg-chat" />}>
      <ChatRoomLoader params={params} />
    </Suspense>
  );
}

async function ChatRoomLoader({ params }: Pick<PageProps<"/chats/[characterId]">, "params">) {
  const { characterId } = await params;
  // 캐릭터: 공유 캐시 / 아래 채팅방·메시지·사용량: 사용자별 데이터라 매번 DB 조회
  const character = await getCharacter(characterId);
  if (!character) notFound();

  const { supabase, user } = await requireOnboardedUser(`/chats/${character.id}`);
  // 대화 시작 = 채팅방 생성 → Chats 목록에 나타남 (비활성 캐릭터는 기존 방만)
  const roomId = await getOrCreateRoomId(user.id, character);
  if (roomId == null) notFound();

  const [{ data: rows }, wallet, { data: room }, persona] = await Promise.all([
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("room_id", roomId)
      .order("id", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE + 1),
    getWallet(createAdminClient(), user.id),
    supabase
      .from("chat_rooms")
      .select("affection, unlocked_stage, played_stage")
      .eq("id", roomId)
      .maybeSingle(),
    // 에피소드 시나리오 입력 여부 확인용 (공유 캐시, 서버에서만 사용 — 클라이언트로 넘기지 않음)
    getCharacterPersona(character.id),
  ]);
  const latest = (rows ?? []) as ChatMessage[];
  const relationship = toRelationshipView(
    {
      affection: room?.affection ?? 0,
      unlockedStage: room?.unlocked_stage ?? 0,
      playedStage: room?.played_stage ?? 0,
    },
    persona?.episodes ?? [],
  );

  return (
    <ChatRoom
      roomId={roomId}
      character={{
        id: character.id,
        name: character.name,
        occupation: character.occupation,
        avatar: character.avatar.src,
      }}
      initialMessages={latest.slice(0, MESSAGE_PAGE_SIZE).reverse()}
      initialHasMore={latest.length > MESSAGE_PAGE_SIZE}
      initialWallet={wallet}
      initialRelationship={relationship}
    />
  );
}
