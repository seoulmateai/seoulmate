import { after, NextResponse } from "next/server";
import { z } from "zod";

import { applyAffection, claimEpisode, releaseEpisode } from "@/lib/affection/server";
import {
  EPISODE_COUNT,
  nextEpisodeStage,
  toRelationshipView,
  type RoomAffection,
} from "@/lib/affection/stages";
import { canSpend, type RubyWallet } from "@/lib/billing/pricing";
import { chargeUsage, getWallet } from "@/lib/billing/wallet";
import { getCharacterPersona } from "@/lib/characters";
import { MAX_IMAGE_BYTES, MAX_INPUT_LENGTH } from "@/lib/chat/constants";
import { normalizeImage, type NormalizedImage } from "@/lib/chat/image.server";
import { loadChatContext, maybeUpdateMemory } from "@/lib/chat/memory";
import { getOrCreateRoomId } from "@/lib/chat/server";
import { MESSAGE_COLUMNS, type ChatApiResponse, type ChatMessage } from "@/lib/chat/types";
import { geminiModel } from "@/lib/gemini/client";
import { generateReply } from "@/lib/gemini/reply";
import { captureServerEvent } from "@/lib/posthog/server";
import { deleteChatImage, putChatImage } from "@/lib/r2/chat-images";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/request";

// 답변(최대 25초) 후 after()의 장기 기억 요약(최대 20초)까지 이 시간 안에 끝나야 한다
export const maxDuration = 60;

// multipart/form-data: characterId, content, image(선택), episodeStage(선택)
// - 일반 메시지: 텍스트와 사진 중 하나는 있어야 함
// - 에피소드 시작: episodeStage만 (사용자 메시지 없이 AI가 에피소드를 시작하는 답장 1개)
const bodySchema = z
  .object({
    characterId: z.string(),
    content: z.string().trim().max(MAX_INPUT_LENGTH).default(""),
    image: z.instanceof(File).optional(),
    episodeStage: z.coerce.number().int().min(1).max(EPISODE_COUNT).optional(),
  })
  .refine((b) =>
    b.episodeStage != null ? b.content.length === 0 && !b.image : b.content.length > 0 || b.image,
  );

async function parseBody(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return null;
  const parsed = bodySchema.safeParse({
    characterId: form.get("characterId"),
    content: form.get("content") ?? undefined,
    image: form.get("image") ?? undefined,
    episodeStage: form.get("episodeStage") ?? undefined,
  });
  return parsed.success ? parsed.data : null;
}

function json(body: ChatApiResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  // 1. 세션 · 온보딩 확인. 웹은 쿠키, 앱은 Authorization: Bearer
  const { supabase, user } = await getRequestUser(request);
  if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

  const body = await parseBody(request);
  const character = body ? await getCharacterPersona(body.characterId) : null;
  if (!body || !character) return json({ ok: false, error: "INVALID_REQUEST" }, 400);
  const { content } = body;

  // 사진은 Gemini 호출 전에 검증·WebP 변환
  let image: NormalizedImage | null = null;
  if (body.image) {
    if (body.image.size > MAX_IMAGE_BYTES) return json({ ok: false, error: "INVALID_IMAGE" }, 413);
    image = await normalizeImage(await body.image.arrayBuffer());
    if (!image) return json({ ok: false, error: "INVALID_IMAGE" }, 400);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return json({ ok: false, error: "ONBOARDING_REQUIRED" }, 403);

  const admin = createAdminClient();
  const roomId = await getOrCreateRoomId(user.id, character);
  // 비활성 캐릭터 + 기존 대화방 없음
  if (roomId == null) return json({ ok: false, error: "INVALID_REQUEST" }, 400);

  // 2. 루비 잔액 확인 (무료 + 유료 1루비 이상). 실제 차감은 토큰 수를 아는 답변 성공 후 (lib/billing)
  //    잔액 1루비로 동시에 여러 번 보내면 모두 통과할 수 있음 → 차감은 0에서 멈추고 차액은 감수
  let wallet: RubyWallet;
  try {
    wallet = await getWallet(admin, user.id);
  } catch (e) {
    console.error("[chat] get_ruby_wallet failed", e);
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
  if (!canSpend(wallet)) {
    captureServerEvent(user.id, "chat_rubies_insufficient", {
      character_id: character.id,
      paid_balance: wallet.paid,
    });
    return json({ ok: false, error: "INSUFFICIENT_RUBY", wallet }, 402);
  }

  // 3. 캐릭터 프롬프트 + 장기 기억(요약) + 최근 대화 원문으로 Gemini 호출
  let context: Awaited<ReturnType<typeof loadChatContext>>;
  try {
    context = await loadChatContext(roomId);
  } catch (e) {
    console.error("[chat] loadChatContext failed", e);
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
  const { room } = context;

  // 에피소드 시작: 다음 진행할 단계가 맞는지 확인하고 played_stage를 먼저 올려 둔다 (중복 진행 방지).
  // 답장이 실패하거나 저장되지 않으면 releaseEpisode로 되돌림
  let episodeStage: number | undefined;
  if (body.episodeStage != null) {
    const next = nextEpisodeStage(room, character.episodes);
    let claimed = false;
    if (next === body.episodeStage) {
      try {
        claimed = await claimEpisode(admin, roomId, room.playedStage, next);
      } catch (e) {
        console.error("[chat] claimEpisode failed", e);
        return json({ ok: false, error: "SERVER_ERROR", wallet }, 500);
      }
    }
    if (!claimed) return json({ ok: false, error: "EPISODE_UNAVAILABLE", wallet }, 409);
    episodeStage = body.episodeStage;
  }
  const releaseClaim = async () => {
    if (episodeStage != null) await releaseEpisode(admin, roomId, room.playedStage, episodeStage);
  };

  const turnId = crypto.randomUUID();
  const startedAt = Date.now();
  const reply = await generateReply({
    character,
    nickname: profile.nickname,
    memory: context.memory,
    history: context.history,
    userMessage: content,
    userImage: image?.data,
    affection: room.affection,
    episodeStage,
  });

  const model = geminiModel();
  /** llm_calls 기록. 반환: 행 id (실패 시 null → 과금은 llm_calls 연결 없이 진행) */
  const logCall = async (status: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await admin
      .from("llm_calls")
      .insert({
        user_id: user.id,
        room_id: roomId,
        turn_id: turnId,
        purpose: "REPLY",
        model,
        character_id: character.id,
        persona_version: character.personaVersion,
        latency_ms: Date.now() - startedAt,
        status,
        ...extra,
      })
      .select("id")
      .single();
    if (error) console.error("[chat] llm_calls insert failed", error);
    return data?.id ?? null;
  };

  // 실패·차단된 답변은 과금하지 않음 (사용자에게 답이 안 갔으므로)
  if (reply.status !== "SUCCESS") {
    await Promise.all([logCall(reply.status, { error_code: reply.errorCode }), releaseClaim()]);
    captureServerEvent(user.id, "chat_reply_failed", {
      character_id: character.id,
      status: reply.status,
      error_code: reply.errorCode,
      has_image: image != null,
      episode_stage: episodeStage,
    });
    return reply.status === "BLOCKED"
      ? json({ ok: false, error: "BLOCKED", wallet }, 422)
      : json({ ok: false, error: "LLM_FAILED", wallet }, 502);
  }

  // 4. 사진 R2 업로드 (답변 성공 후에만 → 실패한 요청의 사진이 남지 않음)
  let imagePath: string | null = null;
  if (image) {
    try {
      imagePath = await putChatImage(user.id, image.data);
    } catch (e) {
      console.error("[chat] R2 upload failed", e);
      await logCall("SUCCESS", { error_code: "IMAGE_UPLOAD_FAILED" });
      return json({ ok: false, error: "SERVER_ERROR", wallet }, 500);
    }
  }

  // 5. user/assistant 메시지 저장 (한 문장으로 같이 저장 → 실패 시 둘 다 없음)
  //    AI 답장은 묘사+대사를 한 행에 (lib/chat/content.ts 형식). chat_rooms.last_message_* 는 DB 트리거가 갱신
  //    에피소드 시작 턴은 사용자 메시지 없이 AI 답장만 (첫 만남 메시지와 같은 형태의 턴)
  const userRow = {
    room_id: roomId,
    turn_id: turnId,
    role: "USER",
    content,
    image_path: imagePath,
    image_width: image?.width,
    image_height: image?.height,
  };
  const assistantRow = { room_id: roomId, turn_id: turnId, role: "ASSISTANT", content: reply.content };
  const { data: saved, error: saveError } = await admin
    .from("messages")
    .insert(episodeStage != null ? [assistantRow] : [userRow, assistantRow])
    .select(MESSAGE_COLUMNS)
    .order("id");

  const llmCallId = await logCall("SUCCESS", {
    input_tokens: reply.usage.input,
    cached_input_tokens: reply.usage.cachedInput,
    output_tokens: reply.usage.output,
    thought_tokens: reply.usage.thoughts,
    affection_delta: episodeStage != null ? null : reply.affectionDelta,
  });

  if (saveError) {
    console.error("[chat] messages insert failed", saveError);
    await releaseClaim();
    if (imagePath) {
      await deleteChatImage(imagePath).catch((e) => console.error("[chat] R2 cleanup failed", e));
    }
    return json({ ok: false, error: "SERVER_ERROR", wallet }, 500);
  }

  // 답변이 저장된 뒤에만 과금. 실패해도 답변은 그대로 보냄 (llm_calls에 토큰이 남아 있어 추적 가능)
  let rubiesCharged = 0;
  try {
    const charged = await chargeUsage(admin, { userId: user.id, usage: reply.usage, model, llmCallId });
    rubiesCharged = charged.charged;
    wallet = charged.wallet;
  } catch (e) {
    console.error("[chat] charge_ruby_usage failed", e);
  }

  // 호감도 반영 (답장이 저장된 뒤에만). 실패해도 답장은 그대로 보내고 기존 호감도를 돌려준다
  let roomAfter: RoomAffection =
    episodeStage != null ? { ...room, playedStage: episodeStage } : room;
  let unlocked = false;
  if (episodeStage == null && reply.affectionDelta !== 0) {
    try {
      const applied = await applyAffection(admin, roomId, reply.affectionDelta);
      roomAfter = applied.room;
      unlocked = applied.newlyUnlocked;
    } catch (e) {
      console.error("[chat] apply_affection failed", e);
    }
  }
  const relationship = toRelationshipView(roomAfter, character.episodes);
  // 시나리오가 비어 있는 단계는 해금 기록만 하고 모달을 띄우지 않는다
  const newlyUnlocked = unlocked && relationship.nextEpisodeStage != null;
  if (unlocked) {
    captureServerEvent(user.id, "relationship_stage_reached", {
      character_id: character.id,
      unlocked_stage: roomAfter.unlockedStage,
      has_episode: newlyUnlocked,
    });
  }
  if (episodeStage != null) {
    captureServerEvent(user.id, "episode_started", {
      character_id: character.id,
      episode_stage: episodeStage,
    });
  }

  // 6. 응답을 보낸 뒤 장기 기억 갱신 (조건이 안 되면 DB 조회 2번만 하고 끝)
  after(() =>
    maybeUpdateMemory({
      roomId,
      userId: user.id,
      turnId,
      character,
      nickname: profile.nickname,
    }),
  );

  captureServerEvent(user.id, "chat_message_sent", {
    character_id: character.id,
    has_image: imagePath != null,
    content_length: content.length,
    narration_count: reply.counts.NARRATION,
    dialogue_count: reply.counts.DIALOGUE,
    reply_length: reply.content.length,
    latency_ms: Date.now() - startedAt,
    input_tokens: reply.usage.input,
    output_tokens: reply.usage.output,
    thought_tokens: reply.usage.thoughts,
    rubies_charged: rubiesCharged,
    free_balance: wallet.free,
    paid_balance: wallet.paid,
    episode_stage: episodeStage,
    affection_delta: episodeStage != null ? undefined : reply.affectionDelta,
    affection: roomAfter.affection,
  });

  return json(
    { ok: true, messages: saved as ChatMessage[], wallet, relationship, newlyUnlocked },
    200,
  );
}
