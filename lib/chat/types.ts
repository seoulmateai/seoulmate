export type MessageRole = "USER" | "ASSISTANT";

export type ChatMessage = {
  id: number;
  turn_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

export const MESSAGE_COLUMNS = "id, turn_id, role, content, created_at";

/** 클라이언트에 넘겨도 되는 캐릭터 정보 (systemPrompt 제외) */
export type ChatCharacter = {
  id: string;
  name: string;
  occupation: string;
  avatar: string;
};

export type DailyUsage = { used: number; limit: number };

/** POST /api/chat 응답 */
export type ChatApiResponse =
  | { ok: true; messages: ChatMessage[]; usage: DailyUsage }
  | {
      ok: false;
      error:
        | "UNAUTHENTICATED"
        | "ONBOARDING_REQUIRED"
        | "INVALID_REQUEST"
        | "LIMIT_REACHED"
        | "BLOCKED"
        | "LLM_FAILED"
        | "SERVER_ERROR";
      usage?: DailyUsage;
    };
