import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatRoom } from "@/components/chat/chat-room";
import { getCurrentSession, requireOnboardedUser } from "@/lib/auth/session";
import { toRelationshipView } from "@/lib/affection/stages";
import { getCharacter, getCharacterPersona, getCharacters, getFirstMeeting } from "@/lib/characters";
import { MESSAGE_PAGE_SIZE } from "@/lib/chat/constants";
import { claimGuestTurn, getGuestTurn, guestCookieName, guestMessages } from "@/lib/chat/guest";
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

  const chatCharacter = {
    id: character.id,
    name: character.name,
    age: character.age,
    occupation: character.occupation,
    bio: character.bio,
    keywords: character.keywords,
    avatar: character.avatar.src,
  };
  const cookieStore = await cookies();
  const guestTurnId = cookieStore.get(guestCookieName(character.id))?.value;

  // 로그인 전: 체험 채팅방 (첫 만남 메시지 + 체험 턴 1개). 채팅방·메시지는 만들지 않는다
  if (!(await getCurrentSession())) {
    if (!character.isActive) notFound();
    const admin = createAdminClient();
    const [firstMeeting, turn] = await Promise.all([
      getFirstMeeting(character.id),
      guestTurnId
        ? getGuestTurn(admin, guestTurnId, character.id).catch((e) => {
            console.error("[chat] getGuestTurn failed", e);
            return null;
          })
        : null,
    ]);
    return (
      <ChatRoom
        guest
        roomId={null}
        character={chatCharacter}
        initialMessages={guestMessages(firstMeeting, turn, new Date().toISOString())}
        initialHasMore={false}
        initialWallet={{ free: 0, paid: 0, pendingPoints: 0 }}
        initialRelationship={toRelationshipView(
          { affection: 0, unlockedStage: 0, playedStage: 0 },
          [],
        )}
      />
    );
  }

  const { supabase, user } = await requireOnboardedUser(`/chats/${character.id}`);
  // 대화 시작 = 채팅방 생성 → Chats 목록에 나타남 (비활성 캐릭터는 기존 방만)
  const roomId = await getOrCreateRoomId(user.id, character);
  if (roomId == null) notFound();

  // 로그인 전에 나눈 체험 턴을 이 채팅방으로 옮긴다 (이미 옮겼거나 대화가 있으면 아무것도 안 함)
  if (guestTurnId) {
    await claimGuestTurn(createAdminClient(), guestTurnId, user.id, roomId).catch((e) =>
      console.error("[chat] claimGuestTurn failed", e),
    );
  }

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
      character={chatCharacter}
      scenesUnlocked={room?.unlocked_stage ?? 0}
      initialMessages={latest.slice(0, MESSAGE_PAGE_SIZE).reverse()}
      initialHasMore={latest.length > MESSAGE_PAGE_SIZE}
      initialWallet={wallet}
      initialRelationship={relationship}
    />
  );
}
