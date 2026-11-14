"use client";

import { Asterisk, ImagePlus, Loader2, SendHorizontal, X } from "lucide-react";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";

import { MAX_INPUT_LENGTH } from "@/lib/chat/constants";
import type { PreparedImage } from "@/lib/chat/image.client";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 120;

export function ChatInput({
  value,
  onChange,
  onSend,
  sending,
  image,
  imageState,
  imageError,
  onPickImage,
  onRemoveImage,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  /** 첨부한 사진 (브라우저에서 변환 완료) */
  image: PreparedImage | null;
  imageState: "idle" | "preparing";
  imageError: string | null;
  onPickImage: (file: File) => void;
  onRemoveImage: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const preparing = imageState === "preparing";
  const canSend = (value.trim().length > 0 || image != null) && !sending && !preparing;
  // * 버튼으로 묘사 구간을 연 상태 (다시 누르면 닫는 * 입력). 입력창이 비면 자동으로 풀린다
  const [narrating, setNarrating] = useState(false);
  if (narrating && value === "") setNarrating(false);

  function insertAsterisk() {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + "*" + value.slice(end);
    if (next.length > MAX_INPUT_LENGTH) return;
    onChange(next);
    setNarrating(!narrating);
    // 값이 반영된 뒤 커서를 넣은 * 바로 뒤로
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + 1, start + 1);
    });
  }

  // 내용에 맞춰 높이 자동 조절
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  return (
    <form
      className="shrink-0 px-3 pt-2.5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] md:px-6 md:pt-4 md:pb-5.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      {(image || preparing || imageError) && (
        <div className="mb-2 flex items-end gap-2">
          {preparing && (
            <div className="grid size-16 place-items-center rounded-xl border border-border bg-card">
              <Loader2 className="size-5 animate-spin text-primary/60" />
            </div>
          )}
          {image && !preparing && (
            <div className="relative">
              <Image
                src={image.previewUrl}
                alt="Attached photo"
                width={64}
                height={64}
                unoptimized
                className="size-16 rounded-xl border border-border object-cover"
              />
              <button
                type="button"
                aria-label="Remove photo"
                className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background hover:bg-foreground/80"
                onClick={onRemoveImage}
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          {imageError && <p className="text-xs text-destructive">{imageError}</p>}
        </div>
      )}
      <div className="flex items-end gap-2.5 rounded-2xl border border-border bg-card py-2 pr-2 pl-2 focus-within:border-coral/60">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            // 같은 파일을 다시 고를 수 있게 비움
            e.target.value = "";
            if (file) onPickImage(file);
          }}
        />
        <button
          type="button"
          aria-label="Attach photo"
          title="Attach photo"
          disabled={sending || preparing}
          className="grid size-[43px] shrink-0 place-items-center rounded-[13px] text-muted-foreground hover:text-coral disabled:opacity-50"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-5" />
        </button>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          maxLength={MAX_INPUT_LENGTH}
          placeholder="Write a message..."
          aria-label="Message"
          className="min-h-[43px] flex-1 resize-none bg-transparent py-2.5 text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter 전송, Shift+Enter 줄바꿈. 한글 조합 중 Enter는 무시
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        {/* 전송 버튼에 붙여서 묶음처럼 보이게 (입력창 행의 gap-2.5를 줄임) */}
        <div className="relative -mr-2 shrink-0">
          {narrating && (
            <div
              role="status"
              className="absolute right-0 bottom-full mb-2.5 rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] whitespace-nowrap text-background shadow-md animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
            >
              Use for describing actions or the scene.
              <span className="absolute top-full right-4 size-2 -translate-y-1 rotate-45 bg-foreground" />
            </div>
          )}
          <button
            type="button"
            aria-label={narrating ? "Close action description" : "Start action description"}
            aria-pressed={narrating}
            // 누를 때 입력창 포커스를 빼앗지 않음 (모바일 키보드 유지)
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertAsterisk}
            className={cn(
              "grid size-[43px] place-items-center rounded-[13px] transition-colors",
              narrating ? "text-coral" : "text-muted-foreground hover:text-coral",
            )}
          >
            <Asterisk className="size-5" strokeWidth={2.5} />
          </button>
        </div>
        <button
          type="submit"
          aria-label="Send message"
          disabled={!canSend}
          className={cn(
            "grid size-[43px] shrink-0 place-items-center rounded-[13px] transition-colors",
            canSend
              ? "bg-coral text-white shadow-[0_4px_10px_#ff777244] hover:bg-coral-dark"
              : "bg-muted text-muted-foreground",
          )}
        >
          <SendHorizontal className="size-[18px]" />
        </button>
      </div>
      <p className="mt-2.5 hidden text-center text-[9px] text-muted-foreground md:block">
        Your Seoul story continues with every message ♡
      </p>
    </form>
  );
}
