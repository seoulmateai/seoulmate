-- =====================================================================
-- Seoulmate — 캐릭터를 코드(lib/characters)에서 DB로 이전
--
--  - characters: 캐릭터 정보·프롬프트. 수정은 Supabase 대시보드에서 직접 (service role)
--  - chat_rooms / llm_calls: character_slug → character_id (UUID)
--  - messages.persona_version 삭제 (llm_calls.persona_version으로 turn_id 조인해서 조회)
--  - ⚠️ 기존 채팅방·메시지·LLM 호출 기록을 삭제함 (프로필·사용량·문의는 유지)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. characters
-- ---------------------------------------------------------------------
CREATE TABLE public.characters (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(30)  NOT NULL,
    age             INT          NOT NULL CHECK (age > 0),
    occupation      VARCHAR(60)  NOT NULL,                 -- 직업 · 동네 (카드·프로필)
    bio             VARCHAR(120) NOT NULL,                 -- 카드 한 줄 소개
    intro           TEXT         NOT NULL,                 -- 상세 페이지 소개
    keywords        TEXT[]       NOT NULL DEFAULT '{}',
    badge           VARCHAR(10)  NOT NULL DEFAULT 'new'
                    CHECK (badge IN ('popular', 'new')),
    avatar_path     TEXT         NOT NULL,                 -- R2 오브젝트 키: characters/{id}/{파일명}
    blur_data_url   TEXT,                                  -- scripts/blur.mjs로 생성
    -- 프롬프트 (서버 전용, 클라이언트 노출 금지)
    background      TEXT         NOT NULL,                 -- 배경 (직업, 사는 곳, 사용자와의 관계)
    personality     TEXT         NOT NULL,                 -- 성격
    speech_style    TEXT         NOT NULL,                 -- 말투
    extra_rules     TEXT,                                  -- 캐릭터별 추가 지시 (선택)
    persona_version INT          NOT NULL DEFAULT 1,       -- 프롬프트 칼럼이 바뀌면 트리거가 +1
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,    -- 내릴 때는 삭제 대신 FALSE
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_characters_active_order ON public.characters (sort_order, created_at) WHERE is_active;

CREATE TRIGGER trg_characters_updated_at
    BEFORE UPDATE ON public.characters
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 프롬프트에 들어가는 칼럼이 바뀌면 persona_version 자동 증가
CREATE OR REPLACE FUNCTION public.bump_persona_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF (NEW.name, NEW.age, NEW.background, NEW.personality, NEW.speech_style, NEW.extra_rules)
       IS DISTINCT FROM
       (OLD.name, OLD.age, OLD.background, OLD.personality, OLD.speech_style, OLD.extra_rules)
    THEN
        NEW.persona_version := OLD.persona_version + 1;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_characters_persona_version
    BEFORE UPDATE ON public.characters
    FOR EACH ROW EXECUTE FUNCTION public.bump_persona_version();

-- 서버(service role)만 접근. 프롬프트가 공개 API로 새지 않도록 anon/authenticated 정책 없음
REVOKE ALL ON public.characters FROM anon, authenticated;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;


-- 기존 4명 (persona_version은 코드에서 쓰던 3을 이어감)



-- ---------------------------------------------------------------------
-- 2. 기존 채팅 데이터 삭제
-- ---------------------------------------------------------------------
-- TRUNCATE ... CASCADE는 reports까지 비우므로 DELETE 사용
--   chat_rooms 삭제 → messages cascade 삭제 → reports.message_id는 NULL
DELETE FROM public.chat_rooms;
DELETE FROM public.llm_calls;


-- ---------------------------------------------------------------------
-- 3. chat_rooms: character_slug → character_id
-- ---------------------------------------------------------------------
-- 컬럼 삭제 시 CHECK와 UNIQUE (user_id, character_slug)도 함께 삭제됨
ALTER TABLE public.chat_rooms DROP COLUMN character_slug;
ALTER TABLE public.chat_rooms
    ADD COLUMN character_id UUID NOT NULL
        REFERENCES public.characters (id) ON DELETE RESTRICT,   -- 대화가 있는 캐릭터는 삭제 불가
    ADD CONSTRAINT chat_rooms_user_character_key UNIQUE (user_id, character_id);


-- ---------------------------------------------------------------------
-- 4. llm_calls: character_slug → character_id (통계 보존용이라 FK 없음)
-- ---------------------------------------------------------------------
ALTER TABLE public.llm_calls DROP COLUMN character_slug;
ALTER TABLE public.llm_calls ADD COLUMN character_id UUID;


-- ---------------------------------------------------------------------
-- 5. messages.persona_version 삭제
-- ---------------------------------------------------------------------
ALTER TABLE public.messages DROP COLUMN persona_version;
