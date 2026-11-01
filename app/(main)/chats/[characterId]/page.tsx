import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatRoom } from "@/components/chat/chat-room";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isBillingEnabled } from "@/lib/billing/config";
import { getCharacter, getCharacters } from "@/lib/characters";
import { MESSAGE_PAGE_SIZE } from "@/lib/chat/constants";
import { getDailyUsage, getOrCreateRoomId } from "@/lib/chat/server";
import { MESSAGE_COLUMNS, type ChatMessage } from "@/lib/chat/types";

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

  const [{ data: rows }, { usage, subscribed }] = await Promise.all([
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("room_id", roomId)
      .order("id", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE + 1),
    getDailyUsage(user.id),
  ]);
  const latest = (rows ?? []) as ChatMessage[];

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
      initialUsage={usage}
      subscribed={subscribed}
      canSubscribe={isBillingEnabled() && !subscribed}
    />
  );
}
