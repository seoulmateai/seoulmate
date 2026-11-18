-- =====================================================================
-- Seoulmate — 호감도 + 관계 단계 에피소드
--
--  - characters.affection_triggers / affection_loss: 호감도 상승·하락 행동/대화 목록 (프롬프트)
--  - characters.episode_1 ~ episode_5: 관계 단계 도달 시 해금되는 에피소드 시나리오 (프롬프트)
--    1 = Acquaintance(20) · 2 = Confidant(40) · 3 = Crush(60) · 4 = Lover(80) · 5 = Beloved(100)
--    에피소드를 시작하는 답장 1회에만 프롬프트에 들어간다 (lib/gemini/reply.ts)
--  - chat_rooms.affection: 0~100. AI가 매 답장마다 -5~+5로 판정 → apply_affection()
--  - chat_rooms.unlocked_stage: 도달한 최고 단계 (절대 내려가지 않음 → 호감도가 떨어졌다 올라도 재해금 없음)
--  - chat_rooms.played_stage: 진행한 마지막 에피소드 단계 (서버가 조건부 UPDATE로 갱신)
--  - 관계 단계 이름·행동 규칙은 DB가 아니라 코드(lib/affection, 프롬프트 템플릿)에 있다
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. characters
-- ---------------------------------------------------------------------
ALTER TABLE public.characters
    ADD COLUMN affection_triggers TEXT,   -- 호감도 상승 행동/대화 (여러 개, 줄마다 하나)
    ADD COLUMN affection_loss     TEXT,   -- 호감도 하락 행동/대화
    ADD COLUMN episode_1 TEXT CHECK (length(episode_1) <= 2000),
    ADD COLUMN episode_2 TEXT CHECK (length(episode_2) <= 2000),
    ADD COLUMN episode_3 TEXT CHECK (length(episode_3) <= 2000),
    ADD COLUMN episode_4 TEXT CHECK (length(episode_4) <= 2000),
    ADD COLUMN episode_5 TEXT CHECK (length(episode_5) <= 2000);

-- 새 칼럼도 모두 프롬프트에 들어가므로 persona_version 감시 대상에 추가
CREATE OR REPLACE FUNCTION public.bump_persona_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF (NEW.name, NEW.age, NEW.appearance, NEW.background, NEW.relationship,
        NEW.personality, NEW.speech_style, NEW.extra_rules,
        NEW.affection_triggers, NEW.affection_loss,
        NEW.episode_1, NEW.episode_2, NEW.episode_3, NEW.episode_4, NEW.episode_5)
       IS DISTINCT FROM
       (OLD.name, OLD.age, OLD.appearance, OLD.background, OLD.relationship,
        OLD.personality, OLD.speech_style, OLD.extra_rules,
        OLD.affection_triggers, OLD.affection_loss,
        OLD.episode_1, OLD.episode_2, OLD.episode_3, OLD.episode_4, OLD.episode_5)
    THEN
        NEW.persona_version := OLD.persona_version + 1;
    END IF;
    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------
-- 2. chat_rooms (기존 채팅방은 0에서 시작)
-- ---------------------------------------------------------------------
ALTER TABLE public.chat_rooms
    ADD COLUMN affection      INT NOT NULL DEFAULT 0 CHECK (affection BETWEEN 0 AND 100),
    ADD COLUMN unlocked_stage INT NOT NULL DEFAULT 0 CHECK (unlocked_stage BETWEEN 0 AND 5),
    ADD COLUMN played_stage   INT NOT NULL DEFAULT 0 CHECK (played_stage BETWEEN 0 AND 5),
    ADD CONSTRAINT chat_rooms_played_le_unlocked CHECK (played_stage <= unlocked_stage);


-- ---------------------------------------------------------------------
-- 3. llm_calls: 답장 1회의 호감도 판정값 (판정 품질 점검용)
-- ---------------------------------------------------------------------
ALTER TABLE public.llm_calls ADD COLUMN affection_delta SMALLINT;


-- ---------------------------------------------------------------------
-- 4. 호감도 반영 (service role 전용)
-- ---------------------------------------------------------------------
-- affection = clamp(0, 100, affection + delta), unlocked_stage = max(기존, floor(affection / 20))
-- 행 잠금으로 동시 요청 직렬화. newly_unlocked = 이번 반영으로 새 단계에 처음 도달
-- delta는 코드에서도 -5~5로 자르지만 여기서 한 번 더 자른다
CREATE OR REPLACE FUNCTION public.apply_affection(p_room_id BIGINT, p_delta INT)
RETURNS TABLE (affection INT, unlocked_stage INT, played_stage INT, newly_unlocked BOOLEAN)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_room      public.chat_rooms;
    v_affection INT;
    v_unlocked  INT;
BEGIN
    SELECT * INTO v_room FROM public.chat_rooms r WHERE r.id = p_room_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'room not found: %', p_room_id;
    END IF;

    v_affection := LEAST(100, GREATEST(0, v_room.affection + LEAST(5, GREATEST(-5, COALESCE(p_delta, 0)))));
    v_unlocked  := GREATEST(v_room.unlocked_stage, v_affection / 20);

    UPDATE public.chat_rooms r
       SET affection = v_affection, unlocked_stage = v_unlocked
     WHERE r.id = p_room_id;

    RETURN QUERY SELECT v_affection, v_unlocked, v_room.played_stage, v_unlocked > v_room.unlocked_stage;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_affection(BIGINT, INT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_affection(BIGINT, INT) TO service_role;
