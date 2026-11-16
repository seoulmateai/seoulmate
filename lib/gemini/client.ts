import "server-only";

import { FinishReason, GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";

// 답장(reply.ts)·요약(summary.ts) 공통 설정

export const SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }));

export const BLOCKED_FINISH_REASONS = new Set<FinishReason | undefined>([
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
]);

// 지난 사진은 토큰 비용 때문에 다시 보내지 않고 자리표시 텍스트로만 넣는다
export const PHOTO_PLACEHOLDER = "[photo]";

let client: GoogleGenAI | null = null;
export function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export function geminiModel() {
  const model = process.env.GEMINI_MODEL;
  if (!model) throw new Error("GEMINI_MODEL is not set");
  return model;
}

/** output = candidatesTokenCount, thoughts = thoughtsTokenCount (thinking, 출력 요금으로 청구) */
export type LlmUsage = { input?: number; cachedInput?: number; output?: number; thoughts?: number };

export type LlmFailure = { status: "BLOCKED" | "FAILED" | "TIMEOUT"; errorCode: string };

/** generateContent 예외 → TIMEOUT / FAILED */
export function toLlmFailure(e: unknown, tag: string): LlmFailure {
  const err = e as { name?: string; message?: string; status?: number };
  const timedOut = err.name === "AbortError" || /timed? ?out/i.test(err.message ?? "");
  console.error(`[gemini] ${tag} failed`, e);
  return {
    status: timedOut ? "TIMEOUT" : "FAILED",
    errorCode: (timedOut ? "TIMEOUT" : `HTTP_${err.status ?? "ERROR"}`).slice(0, 50),
  };
}
