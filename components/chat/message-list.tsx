"use client";

import { RotateCw, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { formatBubbleTime, formatDateDivider, sameDay, sameMinute } from "@/lib/chat/format";
import type { ChatCharacter, ChatMessage, MessageRole } from "@/lib/chat/types";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export type OutboxItem = {
  localId: string;
  content: string;
  status: "sending" | "failed";
  error?: string;
  created_at: string;
};

type Item = {
  key: string;
  role: MessageRole;
  content: string;
  created_at: string;
  outbox?: OutboxItem;
};

export function MessageList({
  character,
  messages,
  outbox,
  typing,
  onResend,
  onDiscard,
}: {
  character: ChatCharacter;
  messages: ChatMessage[];
  outbox: OutboxItem[];
  typing: boolean;
  onResend: (localId: string) => void;
  onDiscard: (localId: string) => void;
}) {
  // 날짜·시각은 사용자 시간대 기준이라 하이드레이션 이후에만 표시
  const hydrated = useHydrated();

  const items: Item[] = [
    ...messages.map((m) => ({
      key: `m${m.id}`,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    })),
    ...outbox.map((o) => ({
      key: `o${o.localId}`,
      role: "USER" as const,
      content: o.content,
      created_at: o.created_at,
      outbox: o,
    })),
  ];

  return (
    <ol className="flex flex-col">
      {items.map((item, i) => {
        const prev = items[i - 1];
        const next = items[i + 1];
        const newDay = hydrated && (!prev || !sameDay(prev.created_at, item.created_at));
        // 같은 사람이 같은 분에 보낸 연속 메시지는 한 묶음 (프사는 첫 말풍선, 시각은 마지막 말풍선에만)
        const startsGroup =
          !prev ||
          newDay ||
          prev.role !== item.role ||
          !sameMinute(prev.created_at, item.created_at);
        const endsGroup =
          !next ||
          next.role !== item.role ||
          !sameMinute(item.created_at, next.created_at) ||
          (hydrated && !sameDay(item.created_at, next.created_at));
        const time = hydrated && endsGroup ? formatBubbleTime(item.created_at) : null;

        return (
          <Fragment key={item.key}>
            {newDay && <DateDivider iso={item.created_at} />}
            <li className={cn("flex", startsGroup ? "mt-4" : "mt-1.5")}>
              {item.role === "ASSISTANT" ? (
                <AssistantRow character={character} showProfile={startsGroup} time={time}>
                  {item.content}
                </AssistantRow>
              ) : (
                <UserRow
                  time={item.outbox ? null : time}
                  outbox={item.outbox}
                  onResend={onResend}
                  onDiscard={onDiscard}
                >
                  {item.content}
                </UserRow>
              )}
            </li>
          </Fragment>
        );
      })}
      {typing && (
        <li className="mt-4 flex">
          <AssistantRow character={character} showProfile time={null}>
            <TypingDots />
          </AssistantRow>
        </li>
      )}
    </ol>
  );
}

function DateDivider({ iso }: { iso: string }) {
  return (
    <li className="mt-6 mb-1 flex justify-center">
      <span className="rounded-full bg-white px-3 py-1.5 text-[10px] text-[#a5a5ab]">
        {formatDateDivider(iso)}
      </span>
    </li>
  );
}

function AssistantRow({
  character,
  showProfile,
  time,
  children,
}: {
  character: ChatCharacter;
  showProfile: boolean;
  time: string | null;
  children: React.ReactNode;
}) {
  return (
    // 프사는 말풍선 윗선에 맞춤, 시각은 말풍선 아랫선에 맞춤
    <div className="flex w-full items-start gap-2.5">
      <div className="w-[31px] shrink-0">
        {showProfile && (
          <Link
            href={`/characters/${character.id}`}
            aria-label={`${character.name}'s profile`}
            className="block"
          >
            <Image
              src={character.avatar}
              alt=""
              width={31}
              height={31}
              className="size-[31px] rounded-full bg-[#eee] object-cover object-top"
            />
          </Link>
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-end gap-2">
        <div
          className={cn(
            "max-w-[min(78%,560px)] rounded-[17px] bg-white px-4 py-3 text-[13px] leading-[1.65] break-words whitespace-pre-wrap text-[#4b4a50] shadow-[0_2px_7px_rgba(30,25,30,0.025)] max-md:max-w-[86%] max-md:px-3.5 max-md:py-2.5",
            showProfile && "rounded-tl-[5px]",
          )}
        >
          {children}
        </div>
        {time && <BubbleTime>{time}</BubbleTime>}
      </div>
    </div>
  );
}

function UserRow({
  time,
  outbox,
  onResend,
  onDiscard,
  children,
}: {
  time: string | null;
  outbox?: OutboxItem;
  onResend: (localId: string) => void;
  onDiscard: (localId: string) => void;
  children: React.ReactNode;
}) {
  const failed = outbox?.status === "failed";
  return (
    <div className="flex w-full flex-col items-end gap-1">
      <div className="flex w-full items-end justify-end gap-1.5">
        {failed && (
          <div className="flex shrink-0 overflow-hidden rounded-md bg-destructive text-white">
            <button
              type="button"
              aria-label="Resend"
              className="p-1 hover:bg-black/15"
              onClick={() => onResend(outbox.localId)}
            >
              <RotateCw className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Delete"
              className="border-l border-white/30 p-1 hover:bg-black/15"
              onClick={() => onDiscard(outbox.localId)}
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        {time && <BubbleTime>{time}</BubbleTime>}
        <div
          className={cn(
            "max-w-[min(78%,560px)] rounded-[17px] rounded-br-[5px] bg-bubble-user px-4 py-3 text-[13px] leading-[1.65] break-words whitespace-pre-wrap text-white max-md:max-w-[86%] max-md:px-3.5 max-md:py-2.5",
            outbox?.status === "sending" && "opacity-70",
          )}
        >
          {children}
        </div>
      </div>
      {failed && outbox.error && (
        <p className="text-right text-xs text-destructive">
          {outbox.error}{" "}
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={() => onResend(outbox.localId)}
          >
            Resend
          </button>
        </p>
      )}
    </div>
  );
}

function BubbleTime({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0 pb-1 text-[10px] whitespace-nowrap text-[#a3a3aa]">{children}</span>;
}

function TypingDots() {
  return (
    <span className="flex h-5 items-center gap-1" role="status" aria-label="Typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-primary/50"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
