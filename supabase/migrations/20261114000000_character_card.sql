-- =====================================================================
-- Seoulmate — 캐릭터 카드 확장 + 상황 묘사
--
--  - characters: appearance(외모), relationship(사용자와의 기본 관계), first_meeting(첫 만남)
--    appearance·relationship은 프롬프트에 들어감 → persona_version 트리거 감시 대상에 추가
--    first_meeting은 프롬프트가 아니라 새 채팅방의 첫 ASSISTANT 메시지로만 쓰임
--  - messages.content 형식: 단락은 빈 줄로 구분, 단락 전체가 *...* 이면 상황 묘사(줄글), 아니면 대사(말풍선)
--    AI 답장은 한 턴에 행 1개 (lib/chat/content.ts)
--  - create_chat_room: 채팅방 생성 + 첫 만남 메시지를 한 번에 (기존 채팅방에는 넣지 않음)
--  - touch_chat_room: 채팅 목록 미리보기에서 상황 묘사 단락을 건너뜀
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. characters 칼럼 (기존 캐릭터가 있으므로 NULL 허용, 대시보드에서 채움)
-- ---------------------------------------------------------------------
ALTER TABLE public.characters
    ADD COLUMN appearance    TEXT,   -- 외모 묘사
    ADD COLUMN relationship  TEXT,   -- 사용자와의 기본 관계
    ADD COLUMN first_meeting TEXT    -- 첫 만남 상황 묘사 + 대사. messages.content 형식으로 작성
               CHECK (length(first_meeting) <= 4000);

CREATE OR REPLACE FUNCTION public.bump_persona_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF (NEW.name, NEW.age, NEW.appearance, NEW.background, NEW.relationship,
        NEW.personality, NEW.speech_style, NEW.extra_rules)
       IS DISTINCT FROM
       (OLD.name, OLD.age, OLD.appearance, OLD.background, OLD.relationship,
        OLD.personality, OLD.speech_style, OLD.extra_rules)
    THEN
        NEW.persona_version := OLD.persona_version + 1;
    END IF;
    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------
-- 2. 채팅방 생성 + 첫 만남 메시지
-- ---------------------------------------------------------------------
-- 이미 있으면 기존 방 id만 반환 (첫 만남 메시지는 새로 만들어진 방에만 한 번).
-- 동시 요청은 UNIQUE (user_id, character_id) 충돌로 한쪽만 INSERT 된다.
CREATE OR REPLACE FUNCTION public.create_chat_room(p_user_id UUID, p_character_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_room_id       BIGINT;
    v_first_meeting TEXT;
BEGIN
    INSERT INTO public.chat_rooms (user_id, character_id)
    VALUES (p_user_id, p_character_id)
    ON CONFLICT (user_id, character_id) DO NOTHING
    RETURNING id INTO v_room_id;

    IF v_room_id IS NULL THEN
        SELECT id INTO v_room_id
          FROM public.chat_rooms
         WHERE user_id = p_user_id AND character_id = p_character_id;
        RETURN v_room_id;
    END IF;

    SELECT btrim(first_meeting) INTO v_first_meeting
      FROM public.characters
     WHERE id = p_character_id;

    IF v_first_meeting IS NOT NULL AND v_first_meeting <> '' THEN
        INSERT INTO public.messages (room_id, turn_id, role, content)
        VALUES (v_room_id, gen_random_uuid(), 'ASSISTANT', v_first_meeting);
    END IF;

    RETURN v_room_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_chat_room(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.create_chat_room(UUID, UUID) TO service_role;


-- ---------------------------------------------------------------------
-- 3. 채팅 목록 미리보기: 첫 대사 단락 (없으면 묘사에서 별표만 뺀 것), 사진만이면 'Photo'
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_chat_room()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_preview TEXT;
BEGIN
    IF NEW.content = '' AND NEW.image_path IS NOT NULL THEN
        v_preview := 'Photo';
    ELSE
        SELECT btrim(p) INTO v_preview
          FROM regexp_split_to_table(NEW.content, '\n\s*\n') WITH ORDINALITY AS t(p, n)
         WHERE btrim(p) <> '' AND btrim(p) !~ '^\*[^*]+\*$'
         ORDER BY n
         LIMIT 1;
        v_preview := btrim(replace(coalesce(v_preview, NEW.content), '*', ''));
    END IF;

    UPDATE public.chat_rooms
       SET last_message_at      = NEW.created_at,
           last_message_preview = left(v_preview, 100)
     WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$;
