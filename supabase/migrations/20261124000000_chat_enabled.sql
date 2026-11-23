-- =====================================================================
-- Seoulmate — 캐릭터별 새 대화 시작 허용 여부
--
--  - chat_enabled = false: 홈·Discover·피드에는 그대로 보이지만 "Coming soon"으로 새 대화를 막는다.
--  - 이미 만들어진 채팅방은 그대로 열린다 (is_active = false와 달리 목록에서 숨기지 않음).
--  - 페르소나 칼럼이 아니므로 bump_persona_version 트리거 대상이 아니다.
--  - 설정이 끝나면 대시보드에서 true로 바꾸면 webhook이 캐시를 무효화해 바로 열린다.
-- =====================================================================

ALTER TABLE public.characters
    ADD COLUMN chat_enabled BOOLEAN NOT NULL DEFAULT true;

-- 아직 캐릭터 설정이 덜 된 캐릭터
UPDATE public.characters
SET chat_enabled = false
WHERE lower(name) IN ('haneul', 'dohyun');
