"use client";

import { ImagePlus, Loader2, SendHorizontal, X } from "lucide-react";
import Image from "next/image";
import { useLayoutEffect, useRef } from "react";

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
            <div className="grid size-16 place-items-center rounded-xl border border-[#eeeef0] bg-white">
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
                className="size-16 rounded-xl border border-[#eeeef0] object-cover"
              />
              <button
                type="button"
                aria-label="Remove photo"
                className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-[#4b4a50] text-white hover:bg-black"
                onClick={onRemoveImage}
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          {imageError && <p className="text-xs text-destructive">{imageError}</p>}
        </div>
      )}
      <div className="flex items-end gap-2.5 rounded-2xl border border-[#eeeef0] bg-white py-2 pr-2 pl-2 shadow-[0_4px_14px_rgba(30,25,30,0.04)] focus-within:border-[#ffd0cc]">
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
          className="grid size-[43px] shrink-0 place-items-center rounded-[13px] text-[#85858c] hover:text-coral disabled:opacity-50"
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
          className="min-h-[43px] flex-1 resize-none bg-transparent py-2.5 text-[13px] leading-6 text-[#444] outline-none placeholder:text-[#b4b4ba]"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter 전송, Shift+Enter 줄바꿈. 한글 조합 중 Enter는 무시
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!canSend}
          className={cn(
            "grid size-[43px] shrink-0 place-items-center rounded-[13px] transition-colors",
            canSend
              ? "bg-coral text-white shadow-[0_4px_10px_#ff777244] hover:bg-coral-dark"
              : "bg-[#f3f3f5] text-[#b4b4ba]",
          )}
        >
          <SendHorizontal className="size-[18px]" />
        </button>
      </div>
      <p className="mt-2.5 hidden text-center text-[9px] text-[#aaaab0] md:block">
        Your Seoul story continues with every message ♡
      </p>
    </form>
  );
}
