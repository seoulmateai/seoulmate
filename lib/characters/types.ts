export type CharacterBadge = "popular" | "new";

export type CharacterAvatar = {
  /** R2 공개 URL */
  src: string;
  blurDataURL: string | null;
};

/** 화면에 보여줘도 되는 캐릭터 정보 (프롬프트 칼럼 없음) */
export type Character = {
  /** characters.id (UUID). URL·chat_rooms.character_id에 사용 */
  id: string;
  name: string;
  age: number;
  /** 직업 · 동네 (카드·프로필에 표시) */
  occupation: string;
  /** 카드에 표시할 한 줄 소개 */
  bio: string;
  /** Discover 필터·카드 배지 */
  badge: CharacterBadge;
  avatar: CharacterAvatar;
  intro: string;
  keywords: string[];
  /** false = Discover·상세에서 숨김, 새 대화 불가. 기존 채팅방은 유지 */
  isActive: boolean;
};

/** 시스템 프롬프트 조립용. 서버(/api/chat)에서만 사용 */
export type CharacterPersona = {
  id: string;
  name: string;
  age: number;
  background: string;
  personality: string;
  speechStyle: string;
  extraRules: string | null;
  /** 프롬프트 칼럼이 바뀌면 DB 트리거가 +1. llm_calls에 기록 */
  personaVersion: number;
  isActive: boolean;
};
