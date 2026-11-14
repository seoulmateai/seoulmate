"use client";

import { RotateCw, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import {
  parseMessageContent,
  splitInlineEmphasis,
  type ContentKind,
  type ContentPart,
} from "@/lib/chat/content";
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

/**
 * 새 답장 공개 진행: parts(= parseMessageContent(content)) 중 step번째 단락까지 보임.
 * 그 단락은 chars 글자까지 (0이면 아직 안 보임, 대사는 0 아니면 전체)
 */
export type RevealState = { messageId: number; parts: ContentPart[]; step: number; chars: number };

type BubbleImage = { src: string; width: number; height: number; href?: string };

/** 화면 한 줄 = 메시지의 단락 하나 (묘사는 줄글, 대사는 말풍선) 또는 사진 */
type Item = {
  key: string;
  role: MessageRole;
  kind: ContentKind;
  content: string;
  image?: BubbleImage;
  created_at: string;
  outbox?: OutboxItem;
  /** 메시지의 마지막 줄 (전송 실패 버튼은 여기에만) */
  lastOfMessage: boolean;
  /** 공개 중인 답장의 줄 (등장 애니메이션, 시각 숨김) */
  revealing?: boolean;
};

function messageImage(m: ChatMessage): BubbleImage | undefined {
  if (!m.image_path || !m.image_width || !m.image_height) return undefined;
  const src = chatImageUrl(m.id);
  return { src, width: m.image_width, height: m.image_height, href: src };
}

/** 메시지 1개 → 사진(있으면) + 단락별 줄. 형식은 lib/chat/content.ts */
function toItems(
  key: string,
  role: MessageRole,
  content: string,
  created_at: string,
  image?: BubbleImage,
  outbox?: OutboxItem,
): Item[] {
  const rows: Omit<Item, "lastOfMessage">[] = [];
  if (image) rows.push({ key: `${key}-img`, role, kind: "DIALOGUE", content: "", image, created_at, outbox });
  parseMessageContent(content).forEach((part, i) =>
    rows.push({ key: `${key}-${i}`, role, kind: part.kind, content: part.text, created_at, outbox }),
  );
  return rows.map((row, i) => ({ ...row, lastOfMessage: i === rows.length - 1 }));
}

/** 공개 중인 답장은 지금까지 보인 단락만 남긴다. AI 답장은 사진이 없어서 줄 번호 = 단락 번호 */
function applyReveal(rows: Item[], { step, chars }: RevealState): Item[] {
  return rows.slice(0, step + 1).flatMap((row, i) => {
    if (i < step) return [{ ...row, revealing: true }];
    if (chars === 0) return [];
    const content =
      row.kind === "NARRATION" ? Array.from(row.content).slice(0, chars).join("") : row.content;
    return [{ ...row, content, revealing: true }];
  });
}

export function MessageList({
  character,
  messages,
  outbox,
  typing,
  reveal,
  onResend,
  onDiscard,
}: {
  character: ChatCharacter;
  messages: ChatMessage[];
  outbox: OutboxItem[];
  typing: boolean;
  reveal: RevealState | null;
  onResend: (localId: string) => void;
  onDiscard: (localId: string) => void;
}) {
  // 날짜·시각은 사용자 시간대 기준이라 하이드레이션 이후에만 표시
  const hydrated = useHydrated();
  // 다음 대사 말풍선을 기다리는 중이면 타이핑 점
  const revealWaiting =
    !!reveal && reveal.chars === 0 && reveal.parts[reveal.step]?.kind === "DIALOGUE";

  const items: Item[] = [
    ...messages.flatMap((m) => {
      const rows = toItems(`m${m.id}`, m.role, m.content, m.created_at, messageImage(m));
      return m.id === reveal?.messageId ? applyReveal(rows, reveal) : rows;
    }),
    ...outbox.flatMap((o) =>
      toItems(
        `o${o.localId}`,
        "USER",
        o.content,
        o.created_at,
        o.image && { src: o.image.previewUrl, width: o.image.width, height: o.image.height },
        o,
      ),
    ),
  ];

  const showTyping = typing || revealWaiting;
  // 앞 줄이 같은 묶음의 AI 말풍선이면 타이핑 점도 그 묶음에 이어 붙인다 (프사 없이)
  const last = items.at(-1);
  const typingContinues =
    revealWaiting && !typing && last?.role === "ASSISTANT" && last.kind === "DIALOGUE";

  return (
    <ol className="flex flex-col">
      {items.map((item, i) => {
        const prev = items[i - 1];
        const next = items[i + 1];
        const newDay = hydrated && (!prev || !sameDay(prev.created_at, item.created_at));
        // 같은 사람이 같은 분에 보낸 연속 말풍선은 한 묶음 (프사는 첫 말풍선, 시각은 마지막 말풍선에만).
        // 묘사 줄은 묶음을 끊는다 → 묘사 다음 말풍선에 다시 프사, 묘사 바로 앞 말풍선에 시각
        const continues = (a: Item | undefined, b: Item | undefined) =>
          !!a &&
          !!b &&
          a.role === b.role &&
          a.kind === "DIALOGUE" &&
          b.kind === "DIALOGUE" &&
          sameMinute(a.created_at, b.created_at) &&
          (!hydrated || sameDay(a.created_at, b.created_at));
        const startsGroup = newDay || !continues(prev, item);
        const endsGroup = !continues(item, next);
        const narration = item.kind === "NARRATION";
        const time =
          !item.revealing && hydrated && endsGroup && (!narration || item.lastOfMessage)
            ? formatBubbleTime(item.created_at)
            : null;

        return (
          <Fragment key={item.key}>
            {newDay && <DateDivider iso={item.created_at} />}
            <li
              className={cn(
                "flex",
                startsGroup ? (narration ? "mt-3" : "mt-4") : "mt-1.5",
                item.revealing &&
                  "animate-in duration-300 fade-in slide-in-from-bottom-1 motion-reduce:animate-none",
              )}
            >
              {item.role === "ASSISTANT" ? (
                <AssistantRow
                  character={character}
                  kind={item.kind}
                  showProfile={startsGroup && !narration}
                  time={time}
                >
                  <RichText kind={item.kind} text={item.content} />
                </AssistantRow>
              ) : (
                <UserRow
                  kind={item.kind}
                  image={item.image}
                  time={item.outbox ? null : time}
                  outbox={item.outbox}
                  showOutboxControls={item.lastOfMessage}
                  onResend={onResend}
                  onDiscard={onDiscard}
                >
                  {item.content && <RichText kind={item.kind} text={item.content} />}
                </UserRow>
              )}
            </li>
          </Fragment>
        );
      })}
      {showTyping && (
        <li className={cn("flex", typingContinues ? "mt-1.5" : "mt-4")}>
          <AssistantRow character={character} showProfile={!typingContinues} time={null}>
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
      <span className="rounded-full border border-border bg-card px-3 py-1.5 text-[10px] text-muted-foreground">
        {formatDateDivider(iso)}
      </span>
    </li>
  );
}

/** 묘사는 말풍선 없이 줄글, 대사 말풍선 안의 *강조*는 기울임 */
function RichText({ kind, text }: { kind: ContentKind; text: string }) {
  if (kind === "NARRATION") return <>{text}</>;
  return (
    <>
      {splitInlineEmphasis(text).map((s, i) =>
        s.emphasis ? (
          <em key={i} className="opacity-80">
            {s.text}
          </em>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </>
  );
}

const NARRATION_CLASS =
  "px-1 text-[13px] leading-[1.75] break-words whitespace-pre-wrap text-muted-foreground italic";

function AssistantRow({
  character,
  kind = "DIALOGUE",
  showProfile,
  time,
  children,
}: {
  character: ChatCharacter;
  kind?: ContentKind;
  showProfile: boolean;
  time: string | null;
  children: React.ReactNode;
}) {
  if (kind === "NARRATION") {
    return (
      // 프사 자리만큼 들여서 말풍선과 왼쪽 선을 맞춘다
      <div className="flex w-full items-end gap-2 pl-[41px]">
        <p className={cn(NARRATION_CLASS, "max-w-[min(86%,640px)] max-md:max-w-full")}>
          {children}
        </p>
        {time && <BubbleTime>{time}</BubbleTime>}
      </div>
    );
  }
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
              className="size-[31px] rounded-full bg-muted object-cover object-top"
            />
          </Link>
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-end gap-2">
        <div
          className={cn(
            "max-w-[min(78%,560px)] rounded-[17px] border border-white/12 bg-bubble-ai px-4 py-3 text-[13px] leading-[1.65] break-words whitespace-pre-wrap text-foreground max-md:max-w-[86%] max-md:px-3.5 max-md:py-2.5",
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
  kind,
  image,
  time,
  outbox,
  showOutboxControls,
  onResend,
  onDiscard,
  children,
}: {
  kind: ContentKind;
  image?: BubbleImage;
  time: string | null;
  outbox?: OutboxItem;
  /** 한 메시지가 여러 줄로 나뉘면 마지막 줄에만 재전송·삭제 버튼 */
  showOutboxControls: boolean;
  onResend: (localId: string) => void;
  onDiscard: (localId: string) => void;
  children: React.ReactNode;
}) {
  const failed = showOutboxControls && outbox?.status === "failed";
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
        <div className="flex max-w-[min(78%,560px)] flex-col items-end gap-1.5 max-md:max-w-[86%]">
          {image && <PhotoBubble image={image} />}
          {children &&
            (kind === "NARRATION" ? (
              <p className={cn(NARRATION_CLASS, "text-right")}>{children}</p>
            ) : (
              <div className="rounded-[17px] rounded-br-[5px] border border-coral/25 bg-bubble-user px-4 py-3 text-[13px] leading-[1.65] break-words whitespace-pre-wrap text-bubble-user-foreground max-md:px-3.5 max-md:py-2.5">
                {children}
              </div>
            ))}
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
      className="block h-auto max-w-full rounded-[17px] rounded-br-[5px] bg-muted object-cover"
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
  return <span className="shrink-0 pb-1 text-[10px] whitespace-nowrap text-muted-foreground">{children}</span>;
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
