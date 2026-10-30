import { Suspense } from "react";

import { ChatSidebarList } from "@/components/chat/chat-sidebar-list";
import { ChatsWorkspace } from "@/components/chat/chats-workspace";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getCharacter } from "@/lib/characters";

export default function ChatsLayout({ children }: LayoutProps<"/chats">) {
  return (
    // usePathname이 서스펜드될 때(동적 경로 prerender)를 위한 경계
    <Suspense fallback={<div className="h-[calc(100dvh-var(--topbar-h))] bg-[#fafafa]" />}>
      <ChatsWorkspace
        sidebar={
          <Suspense fallback={<ChatListSkeleton />}>
            <ChatList />
          </Suspense>
        }
      >
        {children}
      </ChatsWorkspace>
    </Suspense>
  );
}

async function ChatList() {
  const { supabase } = await requireOnboardedUser("/chats");

  // RLS: 본인 채팅방만 조회됨
  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("id, character_slug, last_message_at, last_message_preview, created_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const items = (rooms ?? []).flatMap((room) => {
    const character = getCharacter(room.character_slug);
    return character
      ? [
          {
            roomId: room.id,
            characterId: character.id,
            name: character.name,
            avatar: character.avatar.src,
            lastMessageAt: room.last_message_at,
            preview: room.last_message_preview ?? `Say hi to ${character.name}!`,
          },
        ]
      : [];
  });

  return <ChatSidebarList items={items} />;
}

function ChatListSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden>
      <div className="px-5.5 pt-5.5 pb-4">
        <div className="mb-4 h-7 w-28 animate-pulse rounded bg-muted" />
        <div className="h-[42px] animate-pulse rounded-xl bg-muted" />
      </div>
      <ul className="flex flex-col px-3">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-2.5 py-2.5">
            <div className="size-[49px] shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
