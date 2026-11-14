import "server-only";

import type { HistoryMessage } from "@/lib/chat/memory";

import {
  BLOCKED_FINISH_REASONS,
  geminiModel,
  getClient,
  PHOTO_PLACEHOLDER,
  SAFETY_SETTINGS,
  toLlmFailure,
  type LlmFailure,
  type LlmUsage,
} from "./client";

const TIMEOUT_MS = 20_000;
/** 프롬프트로 요청하는 길이. 모델이 넘겨도 MAX_STORED_CHARS에서 자른다 */
const TARGET_CHARS = 1500;
const MAX_STORED_CHARS = 3000;

export type SummaryResult = { status: "SUCCESS"; summary: string; usage: LlmUsage } | LlmFailure;

/**
 * 기존 장기 기억 + 새 대화 → 갱신된 장기 기억 전체.
 * 캐릭터 말투 없이 사실만, 낮은 temperature. 실패하면 호출한 쪽에서 기존 요약을 유지한다.
 */
export async function generateSummary({
  characterName,
  nickname,
  previousSummary,
  messages,
}: {
  characterName: string;
  nickname: string;
  previousSummary: string | null;
  /** 아직 요약에 반영되지 않은 메시지 (오래된 순) */
  messages: HistoryMessage[];
}): Promise<SummaryResult> {
  try {
    const transcript = messages
      .map((m) => {
        const speaker = m.role === "USER" ? nickname : characterName;
        const text = [m.hasImage && PHOTO_PLACEHOLDER, m.content].filter(Boolean).join(" ");
        return `${speaker}: ${text}`;
      })
      .join("\n");

    const res = await getClient().models.generateContent({
      model: geminiModel(),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `<previous_memory>
${previousSummary ?? "(none yet)"}
</previous_memory>

<new_conversation>
${transcript}
</new_conversation>`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: buildSystemInstruction(characterName, nickname),
        safetySettings: SAFETY_SETTINGS,
        temperature: 0.2,
        httpOptions: { timeout: TIMEOUT_MS },
      },
    });

    const candidate = res.candidates?.[0];
    if (res.promptFeedback?.blockReason || BLOCKED_FINISH_REASONS.has(candidate?.finishReason)) {
      return {
        status: "BLOCKED",
        errorCode: String(res.promptFeedback?.blockReason ?? candidate?.finishReason),
      };
    }

    const summary = (res.text ?? "").trim().slice(0, MAX_STORED_CHARS);
    if (!summary) {
      return { status: "FAILED", errorCode: `EMPTY_${candidate?.finishReason ?? "RESPONSE"}` };
    }

    return {
      status: "SUCCESS",
      summary,
      usage: {
        input: res.usageMetadata?.promptTokenCount,
        cachedInput: res.usageMetadata?.cachedContentTokenCount,
        output: res.usageMetadata?.candidatesTokenCount,
      },
    };
  } catch (e) {
    return toLlmFailure(e, "summary");
  }
}

function buildSystemInstruction(characterName: string, nickname: string) {
  return `You maintain the long-term memory of an ongoing story-like chat between ${characterName} (the character) and ${nickname} (the user).

You receive the previous memory and the newest part of the conversation. Output the complete updated memory, merging the new information into the previous memory.

# Keep
- Facts about ${nickname}: life, job, family, friends, pets, likes and dislikes, worries, goals.
- Promises, plans, and things either of them said they would do.
- How the relationship between ${characterName} and ${nickname} has developed, including meaningful moments.
- The story timeline: how many in-story days have passed and what happened on each, as far as the conversation makes it clear. Time in this story is fictional; never use real-world dates.

# Leave out
- Momentary situations (where they are right now, what they are doing at this moment) unless they matter later.
- Small talk with no lasting meaning.

# Rules
- Correct or remove facts that the new conversation shows are outdated. Merge duplicates.
- Write in English, in third person, as short bullet points under these headings (omit a heading with nothing under it): "## About ${nickname}", "## Promises & plans", "## Relationship", "## Story timeline". Keep names as written.
- Plain facts only: no quotes, no ${characterName}'s speech style, no guesses beyond what was said.
- Keep it under ${TARGET_CHARS} characters. When space is short, drop the least important details first.
- Output only the memory, with no preamble.`;
}
