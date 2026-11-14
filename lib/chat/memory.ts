import "server-only";

import type { CharacterPersona } from "@/lib/characters";
import { geminiModel } from "@/lib/gemini/client";
import { generateSummary } from "@/lib/gemini/summary";
import { createAdminClient } from "@/lib/supabase/admin";

import type { MessageRole } from "./types";

// 장기 기억 (chat_rooms.memory_summary)
// - 1턴 = 사용자 메시지 1개 + AI 답변 1개. 같은 turn_id를 공유한다.
//   새 채팅방의 첫 만남 메시지는 사용자 메시지 없이 AI 메시지만 있는 턴.
// - 답변 프롬프트에는 요약 + 최근 RECENT_TURNS턴 원문을 넣는다.
// - 답변을 저장한 뒤 after()에서, 요약에 반영되지 않은 턴이 SUMMARY_EVERY_TURNS턴 이상이면
//   그 턴들을 기존 요약에 합쳐 다시 쓰고 summarized_until_message_id(북마크)를 옮긴다.
//   요약이 원문 범위보다 항상 앞서므로 둘 사이에 빠지는 턴이 없다 (1~2턴은 겹침).
// - 요약이 실패해 밀리면 원문을 MAX_RAW_TURNS턴까지 늘려 빈틈을 막는다.

/** 답변 프롬프트에 원문으로 넣는 최소 턴 수 */
const RECENT_TURNS = 3;
/** 요약 실패로 밀린 경우 원문으로 넣는 최대 턴 수 */
const MAX_RAW_TURNS = 6;
/** 요약에 반영되지 않은 턴이 이만큼 쌓이면 요약 갱신 */
const SUMMARY_EVERY_TURNS = 3;
/** 요약 1회에 넣는 최대 턴 수. 북마크가 없는 기존 대화방은 이보다 오래된 대화를 건너뛴다 */
const MAX_SUMMARY_TURNS = 12;
/** 지금은 사용자 1 + AI 1이지만, 예전 메시지는 AI 답변이 말풍선별로 최대 3행이라 4로 둔다 */
const MAX_MESSAGES_PER_TURN = 4;

export type HistoryMessage = { role: MessageRole; content: string; hasImage: boolean };

type Turn = { lastMessageId: number; messages: HistoryMessage[] };

type Admin = ReturnType<typeof createAdminClient>;

/** 최근 maxTurns턴 (오래된 순). afterId가 있으면 그 이후 메시지만 */
async function fetchRecentTurns(
  admin: Admin,
  roomId: number,
  afterId: number | null,
  maxTurns: number,
): Promise<Turn[]> {
  const limit = maxTurns * MAX_MESSAGES_PER_TURN;
  let query = admin
    .from("messages")
    .select("id, turn_id, role, content, image_path")
    .eq("room_id", roomId)
    .order("id", { ascending: false })
    .limit(limit);
  if (afterId != null) query = query.gt("id", afterId);
  const { data, error } = await query;
  if (error) throw error;

  const turns: Turn[] = [];
  let currentTurnId: string | null = null;
  for (const m of data.reverse()) {
    const message: HistoryMessage = {
      role: m.role === "USER" ? "USER" : "ASSISTANT",
      content: m.content,
      hasImage: m.image_path != null,
    };
    if (m.turn_id === currentTurnId) {
      const turn = turns.at(-1)!;
      turn.messages.push(message);
      turn.lastMessageId = m.id;
    } else {
      turns.push({ lastMessageId: m.id, messages: [message] });
      currentTurnId = m.turn_id;
    }
  }
  // limit에 걸렸으면 가장 오래된 턴은 일부 말풍선만 왔을 수 있다
  if (data.length === limit) turns.shift();
  return turns.slice(-maxTurns);
}

/** 답변 생성에 넣을 장기 기억 + 최근 대화 원문 (오래된 순) */
export async function loadChatContext(
  roomId: number,
): Promise<{ memory: string | null; history: HistoryMessage[] }> {
  const admin = createAdminClient();
  const [{ data: room, error }, turns] = await Promise.all([
    admin
      .from("chat_rooms")
      .select("memory_summary, summarized_until_message_id")
      .eq("id", roomId)
      .single(),
    fetchRecentTurns(admin, roomId, null, MAX_RAW_TURNS),
  ]);
  if (error) throw error;

  const bookmark = room.summarized_until_message_id;
  const unsummarized =
    bookmark == null ? turns.length : turns.filter((t) => t.lastMessageId > bookmark).length;
  const rawTurns = Math.min(MAX_RAW_TURNS, Math.max(RECENT_TURNS, unsummarized));

  return {
    memory: room.memory_summary,
    history: turns.slice(-rawTurns).flatMap((t) => t.messages),
  };
}

/**
 * 요약에 반영되지 않은 턴이 SUMMARY_EVERY_TURNS턴 이상이면 장기 기억을 갱신한다.
 * after()에서 호출 → 응답을 막지 않고, 실패해도 기존 요약을 유지한 채 로그만 남긴다.
 * 사용자 일일 한도는 차감하지 않는다.
 */
export async function maybeUpdateMemory({
  roomId,
  userId,
  turnId,
  character,
  nickname,
}: {
  roomId: number;
  userId: string;
  /** 요약을 일으킨 답변의 turn_id (llm_calls 연결용) */
  turnId: string;
  character: CharacterPersona;
  nickname: string;
}) {
  try {
    const admin = createAdminClient();
    const { data: room, error } = await admin
      .from("chat_rooms")
      .select("memory_summary, summarized_until_message_id")
      .eq("id", roomId)
      .single();
    if (error) throw error;

    const bookmark = room.summarized_until_message_id;
    const turns = await fetchRecentTurns(admin, roomId, bookmark, MAX_SUMMARY_TURNS);
    if (turns.length < SUMMARY_EVERY_TURNS) return;

    const startedAt = Date.now();
    const result = await generateSummary({
      characterName: character.name,
      nickname,
      previousSummary: room.memory_summary,
      messages: turns.flatMap((t) => t.messages),
    });

    const { error: logError } = await admin.from("llm_calls").insert({
      user_id: userId,
      room_id: roomId,
      turn_id: turnId,
      purpose: "SUMMARY",
      model: geminiModel(),
      character_id: character.id,
      persona_version: character.personaVersion,
      latency_ms: Date.now() - startedAt,
      status: result.status,
      ...(result.status === "SUCCESS"
        ? {
            input_tokens: result.usage.input,
            cached_input_tokens: result.usage.cachedInput,
            output_tokens: result.usage.output,
          }
        : { error_code: result.errorCode }),
    });
    if (logError) console.error("[memory] llm_calls insert failed", logError);

    if (result.status !== "SUCCESS") return;

    // 북마크가 읽은 값 그대로일 때만 저장 → 동시에 두 번 돌아도 한 번만 반영
    let update = admin
      .from("chat_rooms")
      .update({
        memory_summary: result.summary,
        summarized_until_message_id: turns.at(-1)!.lastMessageId,
        summary_updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);
    update =
      bookmark == null
        ? update.is("summarized_until_message_id", null)
        : update.eq("summarized_until_message_id", bookmark);
    const { data: updated, error: updateError } = await update.select("id");
    if (updateError) throw updateError;
    if (updated.length === 0) console.info("[memory] skipped: summarized concurrently", roomId);
  } catch (e) {
    console.error("[memory] update failed", e);
  }
}
