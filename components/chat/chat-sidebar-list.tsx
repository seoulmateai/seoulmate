"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { ListTime } from "./local-time";

export type ChatSidebarItem = {
  roomId: number;
  characterId: string;
  name: string;
  avatar: string;
  lastMessageAt: string | null;
  preview: string;
};

export function ChatSidebarList({ items }: { items: ChatSidebarItem[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter((i) => i.name.toLowerCase().includes(q) || i.preview.toLowerCase().includes(q))
    : items;

  return (
    <>
      <div className="px-4 pt-4 pb-2.5 md:px-5.5 md:pt-5.5 md:pb-4">
        <h1 className="mb-3 text-xl font-extrabold tracking-[-0.6px] md:mb-4 md:text-[22px]">
          My Chats
        </h1>
        {items.length > 0 && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="h-[42px] w-full rounded-xl border border-border bg-muted px-3.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-coral"
          />
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-10 text-center">
          <p className="text-sm text-muted-foreground">
            No conversations yet.
            <br />
            Pick someone to start your story with.
          </p>
          <Link
            href="/"
            className="rounded-[13px] bg-coral px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-coral-dark"
          >
            Meet the characters
          </Link>
        </div>
      ) : (
        // 모바일: 목록이 플로팅 하단 탭 뒤로 스크롤되므로 마지막 항목이 가려지지 않게 여백을 둔다
        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-(--bottomtab-h) md:px-3 md:pb-3.5">
          <p className="px-2.5 pt-3 pb-2 text-[10px] font-extrabold tracking-[1.2px] text-muted-foreground uppercase">
            Recent conversations
          </p>
          {visible.length === 0 && (
            <p className="px-2.5 py-4 text-xs text-muted-foreground">No matching conversations.</p>
          )}
          <ul>
            {visible.map((item) => {
              const href = `/chats/${item.characterId}`;
              const active = pathname === href;
              return (
                <li key={item.roomId}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-[13px] px-2.5 py-2.5 transition-colors",
                      active ? "bg-coral-soft" : "hover:bg-muted",
                    )}
                  >
                    <Image
                      src={item.avatar}
                      alt=""
                      width={49}
                      height={49}
                      className="size-[49px] shrink-0 rounded-full bg-muted object-cover object-top"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-bold text-foreground">
                          {item.name}
                        </span>
                        {item.lastMessageAt && (
                          <ListTime
                            iso={item.lastMessageAt}
                            className="shrink-0 text-[10px] text-muted-foreground"
                          />
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{item.preview}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
