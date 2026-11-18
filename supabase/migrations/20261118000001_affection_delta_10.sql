-- =====================================================================
-- Seoulmate — 호감도 1회 변화 폭 ±5 → ±10 (lib/affection/stages.ts MAX_AFFECTION_DELTA와 맞춤)
-- =====================================================================

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

    v_affection := LEAST(100, GREATEST(0, v_room.affection + LEAST(10, GREATEST(-10, COALESCE(p_delta, 0)))));
    v_unlocked  := GREATEST(v_room.unlocked_stage, v_affection / 20);

    UPDATE public.chat_rooms r
       SET affection = v_affection, unlocked_stage = v_unlocked
     WHERE r.id = p_room_id;

    RETURN QUERY SELECT v_affection, v_unlocked, v_room.played_stage, v_unlocked > v_room.unlocked_stage;
END;
$$;

-- CREATE OR REPLACE는 권한을 유지하지만 명시해 둔다
REVOKE EXECUTE ON FUNCTION public.apply_affection(BIGINT, INT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_affection(BIGINT, INT) TO service_role;
