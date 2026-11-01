"use client";

import { ChevronLeft, Info, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { MESSAGE_PAGE_SIZE } from "@/lib/chat/constants";
import { prepareImage, type PreparedImage } from "@/lib/chat/image.client";
import {
  MESSAGE_COLUMNS,
  type ChatApiResponse,
  type ChatCharacter,
  type ChatMessage,
  type DailyUsage,
} from "@/lib/chat/types";
import { createClient } from "@/lib/supabase/client";

import { ChatInput } from "./chat-input";
import { LimitDialog } from "./limit-dialog";
import { MessageList, type OutboxItem } from "./message-list";

const ERROR_TEXT: Record<string, string> = {
  BLOCKED: "This message couldn't be answered. Try saying it differently.",
  LLM_FAILED: "He couldn't reply right now. Please try again.",
  INVALID_IMAGE: "This photo couldn't be sent. Try a different one.",
};

export function ChatRoom({
  roomId,
  character,
  initialMessages,
  initialHasMore,
  initialUsage,
  subscribed,
  canSubscribe,
}: {
  roomId: number;
  character: ChatCharacter;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  initialUsage: DailyUsage;
  subscribed: boolean;
  /** 결제가 켜져 있고 아직 구독 전 → 한도 모달에 구독 버튼 표시 */
  canSubscribe: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // 서버에 아직 저장되지 않은(전송 중·실패) 내 메시지
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [usage, setUsage] = useState(initialUsage);
  const [limitOpen, setLimitOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<PreparedImage | null>(null);
  const [imageState, setImageState] = useState<"idle" | "preparing">("idle");
  const [imageError, setImageError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  // 이전 메시지를 위에 붙일 때 보던 위치를 유지하기 위한 값
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);

  const sending = outbox.some((m) => m.status === "sending");
  const remaining = Math.max(usage.limit - usage.used, 0);

  // 스크롤 위치: 이전 메시지 로드 → 위치 유지 / 그 외(첫 진입, 새 메시지) → 맨 아래
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prependAnchor.current) {
      const { height, top } = prependAnchor.current;
      el.scrollTop = top + (el.scrollHeight - height);
      prependAnchor.current = null;
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, outbox]);

  const loadOlder = useCallback(async () => {
    const el = scrollRef.current;
    const oldest = messages[0];
    if (!el || !oldest || !hasMore || loadingOlder) return;

    setLoadingOlder(true);
    const { data, error } = await createClient()
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("room_id", roomId)
      .lt("id", oldest.id)
      .order("id", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE + 1);
    setLoadingOlder(false);
    if (error) return;

    const older = (data as ChatMessage[]).slice(0, MESSAGE_PAGE_SIZE).reverse();
    prependAnchor.current = { height: el.scrollHeight, top: el.scrollTop };
    setHasMore(data.length > MESSAGE_PAGE_SIZE);
    setMessages((prev) => [...older, ...prev]);
  }, [messages, hasMore, loadingOlder, roomId]);

  // 맨 위 센티넬이 보이면 이전 메시지 로드
  useEffect(() => {
    const root = scrollRef.current;
    const target = topSentinelRef.current;
    if (!root || !target || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && loadOlder(),
      { root, rootMargin: "200px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadOlder]);

  async function deliver(localId: string, content: string, image?: PreparedImage) {
    let res: Response;
    let body: ChatApiResponse | null = null;
    try {
      const form = new FormData();
      form.set("characterId", character.id);
      form.set("content", content);
      if (image) form.set("image", image.blob, "photo");
      res = await fetch("/api/chat", { method: "POST", body: form });
      body = await res.json().catch(() => null);
    } catch {
      body = null;
    }

    if (body?.ok) {
      if (image) URL.revokeObjectURL(image.previewUrl);
      setOutbox((prev) => prev.filter((m) => m.localId !== localId));
      setMessages((prev) => [...prev, ...body.messages]);
      setUsage(body.usage);
      // 왼쪽 대화 목록의 마지막 메시지·시각 갱신
      router.refresh();
      return;
    }

    if (body?.usage) setUsage(body.usage);
    switch (body?.error) {
      case "LIMIT_REACHED":
        // 전송되지 않은 내용은 입력창으로 되돌림
        setOutbox((prev) => prev.filter((m) => m.localId !== localId));
        setDraft((d) => d || content);
        if (image) {
          setAttachment((a) => {
            if (!a) return image;
            URL.revokeObjectURL(image.previewUrl);
            return a;
          });
        }
        setLimitOpen(true);
        return;
      case "UNAUTHENTICATED":
        router.push(`/login?next=/chats/${character.id}`);
        return;
      case "ONBOARDING_REQUIRED":
        router.push(`/onboarding?next=/chats/${character.id}`);
        return;
      default:
        setOutbox((prev) =>
          prev.map((m) =>
            m.localId === localId
              ? {
                  ...m,
                  status: "failed",
                  error: ERROR_TEXT[body?.error ?? ""] ?? "Message failed to send.",
                }
              : m,
          ),
        );
    }
  }

  async function pickImage(file: File) {
    setImageError(null);
    setImageState("preparing");
    try {
      const prepared = await prepareImage(file);
      setAttachment((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return prepared;
      });
    } catch {
      setImageError("This image format isn't supported.");
    } finally {
      setImageState("idle");
    }
  }

  function removeImage() {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    setImageError(null);
  }

  function send() {
    const content = draft.trim();
    const image = attachment ?? undefined;
    if ((!content && !image) || sending || imageState === "preparing") return;
    if (remaining <= 0) {
      setLimitOpen(true);
      return;
    }
    const localId = crypto.randomUUID();
    setOutbox((prev) => [
      ...prev,
      { localId, content, image, status: "sending", created_at: new Date().toISOString() },
    ]);
    setDraft("");
    setAttachment(null);
    setImageError(null);
    void deliver(localId, content, image);
  }

  function resend(localId: string) {
    const item = outbox.find((m) => m.localId === localId);
    if (!item || sending) return;
    // 다시 보내면 맨 아래로 이동
    setOutbox((prev) => [
      ...prev.filter((m) => m.localId !== localId),
      { ...item, status: "sending", error: undefined, created_at: new Date().toISOString() },
    ]);
    void deliver(localId, item.content, item.image);
  }

  function discard(localId: string) {
    const item = outbox.find((m) => m.localId === localId);
    if (item?.image) URL.revokeObjectURL(item.image.previewUrl);
    setOutbox((prev) => prev.filter((m) => m.localId !== localId));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-chat">
      <header className="flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-3.5 md:h-[76px] md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/chats"
            aria-label="Back to chat list"
            className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#eeeef0] text-[#85858c] hover:border-[#ffd0cc] hover:text-coral md:hidden"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <Image
            src={character.avatar}
            alt=""
            width={43}
            height={43}
            className="size-[43px] shrink-0 rounded-full bg-[#eee] object-cover object-top"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold">{character.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{character.occupation}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="rounded-full bg-coral-soft px-2.5 py-1.5 text-[11px] font-bold text-coral-dark"
            title={subscribed ? "Replies left today" : "Free replies left today"}
          >
            {remaining} / {usage.limit} left today
          </span>
          <Link
            href={`/characters/${character.id}`}
            aria-label={`${character.name}'s profile`}
            title="Character profile"
            className="grid size-9 place-items-center rounded-[10px] border border-[#eeeef0] bg-white text-[#85858c] hover:border-[#ffd0cc] hover:text-coral"
          >
            <Info className="size-4" />
          </Link>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pt-2 pb-5 md:px-[clamp(20px,4vw,58px)]"
      >
        <div ref={topSentinelRef} />
        {loadingOlder && (
          <div className="flex justify-center py-3">
            <Loader2 className="size-5 animate-spin text-primary/60" />
          </div>
        )}
        {!hasMore && messages.length === 0 && outbox.length === 0 && (
          <p className="mt-10 text-center text-sm text-[#999]">
            <strong className="mb-1.5 block text-[#555]">Your story starts here</strong>
            Say hi to {character.name}!
          </p>
        )}
        <MessageList
          character={character}
          messages={messages}
          outbox={outbox}
          typing={sending}
          onResend={resend}
          onDiscard={discard}
        />
      </div>

      <ChatInput
        value={draft}
        onChange={setDraft}
        onSend={send}
        sending={sending}
        image={attachment}
        imageState={imageState}
        imageError={imageError}
        onPickImage={pickImage}
        onRemoveImage={removeImage}
      />

      <LimitDialog
        open={limitOpen}
        onOpenChange={setLimitOpen}
        limit={usage.limit}
        subscribed={subscribed}
        canSubscribe={canSubscribe}
      />
    </div>
  );
}
