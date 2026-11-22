import type { RelationshipView } from "@/lib/affection/stages";
import type { RubyWallet } from "@/lib/billing/pricing";

export type MessageRole = "USER" | "ASSISTANT";

export type ChatMessage = {
  id: number;
  turn_id: string;
  role: MessageRole;
  /** 사진만 보낸 메시지는 '' */
  content: string;
  /** 비공개 R2 오브젝트 키. 화면에는 chatImageUrl(id)로 표시 */
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  created_at: string;
};

export const MESSAGE_COLUMNS =
  "id, turn_id, role, content, image_path, image_width, image_height, created_at";

/** 메시지 이미지 URL (서버가 권한 확인 후 R2 presigned URL로 리다이렉트) */
export function chatImageUrl(messageId: number) {
  return `/api/chat/images/${messageId}`;
}

/** 클라이언트에 넘겨도 되는 캐릭터 정보 (systemPrompt 제외) */
export type ChatCharacter = {
  id: string;
  name: string;
  occupation: string;
  avatar: string;
  age?: number;
  bio?: string;
  keywords?: string[];
};

/**
 * POST /api/chat 응답. wallet = 답변 과금 후 루비 잔액 (요약 과금은 응답 뒤라 다음 응답에 반영)
 * relationship = 이번 답장 반영 후 호감도, newlyUnlocked = 이번 답장으로 새 에피소드가 해금됨
 */
export type ChatApiResponse =
  | {
      ok: true;
      messages: ChatMessage[];
      wallet: RubyWallet;
      relationship: RelationshipView;
      newlyUnlocked: boolean;
    }
  | {
      ok: false;
      error:
        | "UNAUTHENTICATED"
        | "ONBOARDING_REQUIRED"
        | "INVALID_REQUEST"
        | "INVALID_IMAGE"
        | "INSUFFICIENT_RUBY"
        | "EPISODE_UNAVAILABLE"
        | "BLOCKED"
        | "LLM_FAILED"
        | "SERVER_ERROR";
      wallet?: RubyWallet;
    };
