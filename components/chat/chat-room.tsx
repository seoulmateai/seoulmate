"use client";

import { ChevronLeft, Gem, Info, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RelationshipView } from "@/lib/affection/stages";
import type { RubyWallet } from "@/lib/billing/pricing";
import { MESSAGE_PAGE_SIZE } from "@/lib/chat/constants";
import { parseMessageContent } from "@/lib/chat/content";
import { prepareImage, type PreparedImage } from "@/lib/chat/image.client";
import {
  MESSAGE_COLUMNS,
  type ChatApiResponse,
  type ChatCharacter,
  type ChatMessage,
} from "@/lib/chat/types";
import { createClient } from "@/lib/supabase/client";

import { AffectionBar } from "./affection-bar";
import { ChatInput } from "./chat-input";
import { EpisodeDialog } from "./episode-dialog";
import { LimitDialog } from "./limit-dialog";
import { MessageList, type OutboxItem, type RevealState } from "./message-list";

// ???듭옣 怨듦컻 ?띾룄: 臾섏궗??湲???⑥쐞濡???댄븨, ??щ뒗 ??댄븨 ?먯쓣 ?좉퉸 蹂댁뿬以 ??留먰뭾???깆옣
const TICK_MS = 30;
const MIN_CHARS_PER_TICK = 2;
/** 湲?臾섏궗?????쒓컙 ?덉뿉 ???⑥??꾨줉 ???깆쓽 湲???섎? ?섎┛??*/
const NARRATION_MAX_MS = 1500;
const DIALOGUE_DELAY_MIN_MS = 400;
const DIALOGUE_DELAY_MAX_MS = 700;
/** ?⑤씫 ?ъ씠 ?? 留먰뭾???깆옣 ?좊땲硫붿씠??300ms)蹂대떎 吏㏃쑝硫?留덉?留?留먰뭾???좊땲硫붿씠?섏씠 ?딄릿??*/
const PART_PAUSE_MS = 300;

function canAnimate() {
  return !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const ERROR_TEXT: Record<string, string> = {
  BLOCKED: "This message couldn't be answered. Try saying it differently.",
  LLM_FAILED: "He couldn't reply right now. Please try again.",
  INVALID_IMAGE: "This photo couldn't be sent. Try a different one.",
};

const EPISODE_ERROR_TEXT: Record<string, string> = {
  EPISODE_UNAVAILABLE: "This episode isn't available right now.",
  BLOCKED: "The episode couldn't start. Please try again.",
};

export function ChatRoom({
  roomId,
  character,
  initialMessages,
  initialHasMore,
  initialWallet,
  initialRelationship,
}: {
  roomId: number;
  character: ChatCharacter;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  initialWallet: RubyWallet;
  initialRelationship: RelationshipView;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // ?쒕쾭???꾩쭅 ??λ릺吏 ?딆?(?꾩넚 以뫢룹떎?? ??硫붿떆吏
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [wallet, setWallet] = useState(initialWallet);
  const [limitOpen, setLimitOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<PreparedImage | null>(null);
  const [imageState, setImageState] = useState<"idle" | "preparing">("idle");
  const [imageError, setImageError] = useState<string | null>(null);
  // 諛⑷툑 諛쏆? ?듭옣???⑤씫蹂꾨줈 蹂댁뿬二쇰뒗 以묒씠硫?吏꾪뻾 ?곹깭
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [relationship, setRelationship] = useState(initialRelationship);
  // 방금 해금된 에피소드 단계 → 답장 공개가 끝나면 모달로 안내
  const [unlockedStage, setUnlockedStage] = useState<number | null>(null);
  const [episodeStarting, setEpisodeStarting] = useState(false);
  const [episodeError, setEpisodeError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  // ?댁쟾 硫붿떆吏瑜??꾩뿉 遺숈씪 ??蹂대뜕 ?꾩튂瑜??좎??섍린 ?꾪븳 媛?
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);

  const sending = outbox.some((m) => m.status === "sending") || episodeStarting;
  const rubies = wallet.free + wallet.paid;

  // ?ㅽ겕濡??꾩튂: ?댁쟾 硫붿떆吏 濡쒕뱶 ???꾩튂 ?좎? / 洹???泥?吏꾩엯, ??硫붿떆吏) ??留??꾨옒
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
  }, [messages, outbox, reveal]);

  // ?듭옣 怨듦컻 吏꾪뻾: ???④퀎????대㉧濡??ㅼ쓬 ?곹깭濡??섍릿??
  useEffect(() => {
    if (!reveal) return;
    const { parts, step, chars } = reveal;
    const len = Array.from(parts[step].text).length;
    let next: RevealState | null;
    let delay: number;
    if (chars >= len) {
      next = step + 1 < parts.length ? { ...reveal, step: step + 1, chars: 0 } : null;
      delay = PART_PAUSE_MS;
    } else if (parts[step].kind === "DIALOGUE") {
      next = { ...reveal, chars: len };
      delay = Math.min(DIALOGUE_DELAY_MAX_MS, DIALOGUE_DELAY_MIN_MS + len * 8);
    } else {
      const perTick = Math.max(MIN_CHARS_PER_TICK, Math.ceil((len * TICK_MS) / NARRATION_MAX_MS));
      next = { ...reveal, chars: Math.min(len, chars + perTick) };
      delay = TICK_MS;
    }
    const timer = setTimeout(() => setReveal(next), delay);
    return () => clearTimeout(timer);
  }, [reveal]);

  // 怨듦컻 以묒뿉 ??쓣 ?좊굹硫?諛붾줈 ?꾨? 蹂댁뿬以??(諛깃렇?쇱슫????대㉧???먮젮吏?
  const revealing = reveal !== null;
  useEffect(() => {
    if (!revealing) return;
    const onVisibility = () => document.hidden && setReveal(null);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [revealing]);

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

  // 留????쇳떚?ъ씠 蹂댁씠硫??댁쟾 硫붿떆吏 濡쒕뱶
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

  /** 답장 성공 공통 처리: 메시지 추가 + 답장 공개 애니메이션 + 루비·호감도 갱신 */
  function showReply(body: Extract<ChatApiResponse, { ok: true }>) {
    setMessages((prev) => [...prev, ...body.messages]);
    const reply = [...body.messages].reverse().find((m) => m.role === "ASSISTANT");
    const parts = reply ? parseMessageContent(reply.content) : [];
    setReveal(
      reply && parts.length > 0 && canAnimate()
        ? { messageId: reply.id, parts, step: 0, chars: 0 }
        : null,
    );
    setWallet(body.wallet);
    setRelationship(body.relationship);
    setEpisodeError(null);
    if (body.newlyUnlocked && body.relationship.nextEpisodeStage != null) {
      setUnlockedStage(body.relationship.nextEpisodeStage);
    }
  }

  /** 에피소드 시작: 사용자 메시지 없이 AI가 에피소드를 여는 답장 1개를 받는다 */
  async function startEpisode(stage: number) {
    setUnlockedStage(null);
    if (sending) return;
    if (rubies < 1) {
      setLimitOpen(true);
      return;
    }
    setReveal(null);
    setEpisodeError(null);
    setEpisodeStarting(true);
    let body: ChatApiResponse | null = null;
    try {
      const form = new FormData();
      form.set("characterId", character.id);
      form.set("episodeStage", String(stage));
      const res = await fetch("/api/chat", { method: "POST", body: form });
      body = await res.json().catch(() => null);
    } catch {
      body = null;
    }
    setEpisodeStarting(false);

    if (body?.ok) {
      showReply(body);
      router.refresh();
      return;
    }
    if (body?.wallet) setWallet(body.wallet);
    switch (body?.error) {
      case "INSUFFICIENT_RUBY":
        setLimitOpen(true);
        return;
      case "UNAUTHENTICATED":
        router.push(`/login?next=/chats/${character.id}`);
        return;
      case "EPISODE_UNAVAILABLE":
        // 다른 탭에서 이미 진행했거나 시나리오가 바뀜 → 서버 상태로 다시 그림
        setRelationship((r) => ({ ...r, nextEpisodeStage: null }));
        setEpisodeError(EPISODE_ERROR_TEXT.EPISODE_UNAVAILABLE);
        router.refresh();
        return;
      default:
        setEpisodeError(
          EPISODE_ERROR_TEXT[body?.error ?? ""] ?? "The episode couldn't start. Please try again.",
        );
    }
  }

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
      showReply(body);
      // ?쇱そ ???紐⑸줉??留덉?留?硫붿떆吏쨌?쒓컖 媛깆떊
      router.refresh();
      return;
    }

    if (body?.wallet) setWallet(body.wallet);
    switch (body?.error) {
      case "INSUFFICIENT_RUBY":
        // ?꾩넚?섏? ?딆? ?댁슜? ?낅젰李쎌쑝濡??섎룎由?
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
    if (rubies < 1) {
      setLimitOpen(true);
      return;
    }
    const localId = crypto.randomUUID();
    // ?댁쟾 ?듭옣???꾩쭅 蹂댁뿬二쇰뒗 以묒씠硫??⑥? ?댁슜??諛붾줈 ??蹂댁뿬以??
    setReveal(null);
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
    setReveal(null);
    // ?ㅼ떆 蹂대궡硫?留??꾨옒濡??대룞
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
      <header className="flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3.5 md:h-[76px] md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/chats"
            aria-label="Back to chat list"
            className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-border text-muted-foreground hover:border-coral/40 hover:text-coral md:hidden"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <Image
            src={character.avatar}
            alt=""
            width={43}
            height={43}
            className="size-[43px] shrink-0 rounded-full bg-muted object-cover object-top"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold">{character.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{character.occupation}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2.5 py-1.5 text-[11px] font-bold text-coral hover:bg-coral/20"
            title={`Free today: ${wallet.free} · Purchased: ${wallet.paid}`}
            aria-label={`${rubies} rubies (free today ${wallet.free}, purchased ${wallet.paid}). Get more rubies`}
          >
            <Gem className="size-3.5" aria-hidden />
            {rubies}
          </Link>
          <Link
            href={`/characters/${character.id}`}
            aria-label={`${character.name}'s profile`}
            title="Character profile"
            className="grid size-9 place-items-center rounded-[10px] border border-border bg-background text-muted-foreground hover:border-coral/40 hover:text-coral"
          >
            <Info className="size-4" />
          </Link>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <AffectionBar
          relationship={relationship}
          starting={episodeStarting}
          disabled={sending || revealing}
          error={episodeError}
          onStartEpisode={startEpisode}
        />

        {/* pt-14: 위에 떠 있는 호감도 칩에 첫 메시지가 가려지지 않게 */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pt-14 pb-5 md:px-[clamp(20px,4vw,58px)]"
        >
          <div ref={topSentinelRef} />
          {loadingOlder && (
            <div className="flex justify-center py-3">
              <Loader2 className="size-5 animate-spin text-primary/60" />
            </div>
          )}
          {!hasMore && messages.length === 0 && outbox.length === 0 && (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              <strong className="mb-1.5 block text-foreground">Your story starts here</strong>
              Say hi to {character.name}!
            </p>
          )}
          <MessageList
            character={character}
            messages={messages}
            outbox={outbox}
            typing={sending}
            reveal={reveal}
            onResend={resend}
            onDiscard={discard}
          />
        </div>
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

      <LimitDialog open={limitOpen} onOpenChange={setLimitOpen} />
      {/* 답장 공개(타이핑 효과)가 끝난 뒤에 띄운다 */}
      <EpisodeDialog
        stage={revealing ? null : unlockedStage}
        characterName={character.name}
        onStart={startEpisode}
        onClose={() => setUnlockedStage(null)}
      />
    </div>
  );
}
