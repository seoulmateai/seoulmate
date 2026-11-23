-- =====================================================================
-- Seoulmate — 로그인 전 게스트 체험 대화
--
--  - 게스트는 캐릭터당 한 턴(사용자 메시지 1 + AI 답장 1)만 보낼 수 있다. 다음 메시지는 로그인 후.
--  - 게스트 대화는 messages가 아니라 guest_turns에 둔다 (게스트는 profiles 행이 없음).
--  - 로그인 후 같은 캐릭터 채팅방을 처음 열면 claim_guest_turn이 이 턴을 채팅방으로 옮긴다.
--  - 남용 방지: IP 해시당 하루(KST) p_daily_limit턴. 답장이 실패하면 예약을 지워 횟수에 넣지 않는다.
--  - 모든 쓰기는 서버(service role)에서만. RLS를 켜고 정책을 두지 않는다.
-- =====================================================================

CREATE TABLE public.guest_turns (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash             TEXT         NOT NULL,
    character_id        UUID         NOT NULL REFERENCES public.characters (id) ON DELETE CASCADE,
    -- 아래는 답장이 성공한 뒤 채운다 (예약 직후에는 NULL)
    user_content        TEXT         CHECK (char_length(user_content) <= 4000),
    assistant_content   TEXT         CHECK (char_length(assistant_content) <= 4000),
    affection_delta     INT,
    model               VARCHAR(60),
    persona_version     INT,
    input_tokens        INT,
    cached_input_tokens INT,
    output_tokens       INT,
    thought_tokens      INT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    claimed_at          TIMESTAMPTZ,
    claimed_by          UUID         REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX idx_guest_turns_ip_created ON public.guest_turns (ip_hash, created_at DESC);

ALTER TABLE public.guest_turns ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- 게스트 턴 예약: 오늘(KST) 같은 IP의 턴이 p_daily_limit개 미만이면 행을 만들고 id 반환, 아니면 NULL
-- 같은 IP의 동시 요청은 advisory lock으로 직렬화
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_guest_turn(
    p_ip_hash      TEXT,
    p_character_id UUID,
    p_daily_limit  INT
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_day_start TIMESTAMPTZ := ((now() AT TIME ZONE 'Asia/Seoul')::date)::timestamp AT TIME ZONE 'Asia/Seoul';
    v_count     INT;
    v_id        UUID;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('guest_turn:' || p_ip_hash));

    SELECT count(*) INTO v_count
      FROM public.guest_turns g
     WHERE g.ip_hash = p_ip_hash AND g.created_at >= v_day_start;

    IF v_count >= p_daily_limit THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.guest_turns (ip_hash, character_id)
    VALUES (p_ip_hash, p_character_id)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


-- ---------------------------------------------------------------------
-- 게스트 턴을 로그인한 사용자의 채팅방으로 옮긴다.
--  - 아직 안 옮겼고, 답장까지 저장됐고, 1일 이내이고, 채팅방 캐릭터가 같을 때만
--  - 채팅방에 사용자 메시지가 이미 있으면(다른 기기에서 대화를 시작함) 옮기지 않고 처리 완료로만 표시
--  - 옮기면 호감도 판정도 반영한다. 반환: 메시지를 옮겼으면 true
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_guest_turn(
    p_turn_id UUID,
    p_user_id UUID,
    p_room_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_turn    public.guest_turns;
    v_turn_id UUID := gen_random_uuid();
BEGIN
    SELECT g.* INTO v_turn
      FROM public.guest_turns g
      JOIN public.chat_rooms r ON r.id = p_room_id
                              AND r.user_id = p_user_id
                              AND r.character_id = g.character_id
     WHERE g.id = p_turn_id
       AND g.claimed_at IS NULL
       AND g.assistant_content IS NOT NULL
       AND g.created_at > now() - INTERVAL '1 day'
       FOR UPDATE OF g;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE public.guest_turns g
       SET claimed_at = now(), claimed_by = p_user_id
     WHERE g.id = p_turn_id;

    IF EXISTS (SELECT 1 FROM public.messages m WHERE m.room_id = p_room_id AND m.role = 'USER') THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.messages (room_id, turn_id, role, content)
    VALUES (p_room_id, v_turn_id, 'USER', v_turn.user_content),
           (p_room_id, v_turn_id, 'ASSISTANT', v_turn.assistant_content);

    IF COALESCE(v_turn.affection_delta, 0) <> 0 THEN
        PERFORM public.apply_affection(p_room_id, v_turn.affection_delta);
    END IF;

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_guest_turn(TEXT, UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reserve_guest_turn(TEXT, UUID, INT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.claim_guest_turn(UUID, UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_guest_turn(UUID, UUID, BIGINT) TO service_role;
