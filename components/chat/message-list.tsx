"use client";

import { RotateCw, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { formatBubbleTime, formatDateDivider, sameDay, sameMinute } from "@/lib/chat/format";
import { bubbleImageSize, type PreparedImage } from "@/lib/chat/image.client";
import { chatImageUrl, type ChatCharacter, type ChatMessage, type MessageRole } from "@/lib/chat/types";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export type OutboxItem = {
  localId: string;
  /** 사진만 보내면 '' */
  content: string;
  image?: PreparedImage;
  status: "sending" | "failed";
  error?: string;
  created_at: string;
};

type BubbleImage = { src: string; width: number; height: number; href?: string };

type Item = {
  key: string;
  role: MessageRole;
  content: string;
  image?: BubbleImage;
  created_at: string;
  outbox?: OutboxItem;
};

function messageImage(m: ChatMessage): BubbleImage | undefined {
  if (!m.image_path || !m.image_width || !m.image_height) return undefined;
  const src = chatImageUrl(m.id);
  return { src, width: m.image_width, height: m.image_height, href: src };
}

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
      image: messageImage(m),
      created_at: m.created_at,
    })),
    ...outbox.map((o) => ({
      key: `o${o.localId}`,
      role: "USER" as const,
      content: o.content,
      image: o.image && {
        src: o.image.previewUrl,
        width: o.image.width,
        height: o.image.height,
      },
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
                  image={item.image}
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
  image,
  time,
  outbox,
  onResend,
  onDiscard,
  children,
}: {
  image?: BubbleImage;
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
            "flex max-w-[min(78%,560px)] flex-col items-end gap-1.5 max-md:max-w-[86%]",
            outbox?.status === "sending" && "opacity-70",
          )}
        >
          {image && <PhotoBubble image={image} />}
          {children && (
            <div className="rounded-[17px] rounded-br-[5px] bg-bubble-user px-4 py-3 text-[13px] leading-[1.65] break-words whitespace-pre-wrap text-white max-md:px-3.5 max-md:py-2.5">
              {children}
            </div>
          )}
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

function PhotoBubble({ image }: { image: BubbleImage }) {
  // 크기를 미리 알고 있어서 로드 전에도 자리를 차지 → 스크롤 위치가 밀리지 않음
  const size = bubbleImageSize(image.width, image.height);
  const img = (
    <Image
      src={image.src}
      alt="Photo"
      width={size.width}
      height={size.height}
      // 비공개 이미지: 서버 이미지 최적화를 거치지 않고 브라우저가 쿠키와 함께 직접 요청
      unoptimized
      className="block h-auto max-w-full rounded-[17px] rounded-br-[5px] bg-[#eee] object-cover"
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    />
  );
  return image.href ? (
    <a href={image.href} target="_blank" rel="noopener" aria-label="Open photo">
      {img}
    </a>
  ) : (
    img
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
