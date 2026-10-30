-- =====================================================================
-- Seoulmate — 초기 스키마 (Supabase, supabase/migrations/20261030000000_init.sql)
-- 범위: 프로필, 채팅, LLM 호출 기록, 신고, 문의하기, 일일 사용량
-- 제외: 구독/결제 (이후 별도 마이그레이션)
--
-- 원칙
--  - 인증은 Supabase Auth(auth.users)가 담당. 여기서는 프로필만 관리
--  - 캐릭터 정보·프롬프트는 코드(lib/characters)로 관리, DB에는 slug만 저장
--  - 클라이언트(anon key)는 본인 데이터 "조회" 위주. 메시지·채팅방·사용량 쓰기는
--    서버(Route Handler, service role)에서만 처리 → 클라이언트가 AI 답변을 위조할 수 없음
--  - 회원 탈퇴 = auth.admin.deleteUser → cascade로 채팅·메시지 삭제,
--    llm_calls / reports는 user_id만 NULL로 남겨 통계 보존
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. 공통: updated_at 자동 갱신
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------
-- 1. 프로필
-- ---------------------------------------------------------------------
-- 행이 존재한다 = 온보딩(생년월일·닉네임·약관 동의) 완료.
-- 행 생성은 complete_onboarding() RPC로만 한다 (role/status를 사용자가 정하지 못하게).
CREATE TABLE public.profiles (
    id                  UUID         PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    nickname            VARCHAR(30)  NOT NULL CHECK (length(btrim(nickname)) > 0),
    status              VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    role                VARCHAR(10)  NOT NULL DEFAULT 'USER'
                        CHECK (role IN ('USER', 'ADMIN')),
    birth_date          DATE         NOT NULL,
    age_verified_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    age_verify_provider VARCHAR(20)  NOT NULL DEFAULT 'SELF',   -- 추후 본인인증 도입 시 'PASS' 등
    terms_agreed_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    privacy_agreed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    marketing_agreed    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 온보딩 완료: 로그인한 사용자가 직접 호출
--   supabase.rpc('complete_onboarding', { p_nickname, p_birth_date, p_marketing_agreed })
CREATE OR REPLACE FUNCTION public.complete_onboarding(
    p_nickname         TEXT,
    p_birth_date       DATE,
    p_marketing_agreed BOOLEAN DEFAULT FALSE
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_profile public.profiles;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF p_birth_date > (now() AT TIME ZONE 'Asia/Seoul')::date THEN
        RAISE EXCEPTION 'INVALID_BIRTH_DATE';   -- 미래 날짜만 거름 (연령 제한 없음)
    END IF;

    INSERT INTO public.profiles (id, nickname, birth_date, marketing_agreed)
    VALUES (v_uid, btrim(p_nickname), p_birth_date, COALESCE(p_marketing_agreed, FALSE))
    RETURNING * INTO v_profile;   -- 이미 있으면 PK 충돌로 실패

    RETURN v_profile;
END;
$$;


-- ---------------------------------------------------------------------
-- 2. 채팅
-- ---------------------------------------------------------------------
-- 사용자 × 캐릭터당 채팅방 1개. 캐릭터 추가 시 CHECK 목록도 함께 수정.
CREATE TABLE public.chat_rooms (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id                     UUID         NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    character_slug              VARCHAR(30)  NOT NULL
                                CHECK (character_slug IN ('office-worker', 'idol', 'athlete', 'hongdae')),
    memory_summary              TEXT,           -- 장기 기억(대화 요약), 추후 사용
    summarized_until_message_id BIGINT,
    summary_updated_at          TIMESTAMPTZ,
    last_message_at             TIMESTAMPTZ,
    last_message_preview        VARCHAR(100),   -- 채팅 목록 미리보기 (트리거로 갱신)
    last_read_message_id        BIGINT,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (user_id, character_slug)
);
CREATE INDEX idx_chat_rooms_user_last ON public.chat_rooms (user_id, last_message_at DESC NULLS LAST);


-- 말풍선 1개 = 행 1개. 한 번의 사용자 입력에 대한 AI 답변이 여러 말풍선이면 같은 turn_id 공유.
CREATE TABLE public.messages (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id         BIGINT       NOT NULL REFERENCES public.chat_rooms (id) ON DELETE CASCADE,
    turn_id         UUID         NOT NULL,
    role            VARCHAR(10)  NOT NULL CHECK (role IN ('USER', 'ASSISTANT')),
    content         TEXT         NOT NULL CHECK (length(content) <= 4000),
    persona_version INT,                        -- ASSISTANT만. 코드의 프롬프트 버전
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_room_id ON public.messages (room_id, id DESC);   -- 커서 페이지네이션


-- 메시지 저장 시 채팅방의 마지막 메시지 정보 갱신
CREATE OR REPLACE FUNCTION public.touch_chat_room()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.chat_rooms
       SET last_message_at      = NEW.created_at,
           last_message_preview = left(NEW.content, 100)
     WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_touch_room
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.touch_chat_room();


-- ---------------------------------------------------------------------
-- 3. LLM 호출 기록 (원가 측정·장애 분석). 대화 내용 없음 → 탈퇴 후에도 통계로 보존
-- ---------------------------------------------------------------------
CREATE TABLE public.llm_calls (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             UUID         REFERENCES public.profiles (id) ON DELETE SET NULL,
    room_id             BIGINT       REFERENCES public.chat_rooms (id) ON DELETE SET NULL,
    turn_id             UUID,
    purpose             VARCHAR(10)  NOT NULL DEFAULT 'REPLY'
                        CHECK (purpose IN ('REPLY', 'SUMMARY')),
    provider            VARCHAR(30)  NOT NULL DEFAULT 'gemini',
    model               VARCHAR(60)  NOT NULL,   -- 별칭이 아니라 고정 버전명
    character_slug      VARCHAR(30),
    persona_version     INT,
    input_tokens        INT,
    cached_input_tokens INT,
    output_tokens       INT,
    latency_ms          INT,
    status              VARCHAR(10)  NOT NULL
                        CHECK (status IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'BLOCKED')),
    error_code          VARCHAR(50),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_llm_calls_reply_turn
    ON public.llm_calls (turn_id) WHERE purpose = 'REPLY';
CREATE INDEX idx_llm_calls_user_created ON public.llm_calls (user_id, created_at);
CREATE INDEX idx_llm_calls_created      ON public.llm_calls (created_at);


-- ---------------------------------------------------------------------
-- 4. 신고 (클라이언트에서 직접 작성, user_id는 자동으로 본인)
-- ---------------------------------------------------------------------
-- 메시지가 삭제되면 message_id만 NULL. 탈퇴 시 user_id NULL (memo는 탈퇴 API에서 비우기 권장)
CREATE TABLE public.reports (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID         DEFAULT auth.uid()
                             REFERENCES public.profiles (id) ON DELETE SET NULL,
    message_id  BIGINT       REFERENCES public.messages (id) ON DELETE SET NULL,
    category    VARCHAR(30)  NOT NULL,
    memo        VARCHAR(500),
    status      VARCHAR(15)  NOT NULL DEFAULT 'OPEN'
                CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_reports_status ON public.reports (status, created_at);


-- 마이페이지 문의하기. 사용자는 작성·본인 문의 조회만, 답변은 관리자(대시보드/service role)가 작성.
-- 탈퇴하면 문의도 함께 삭제 (개인정보 포함)
CREATE TABLE public.inquiries (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID          NOT NULL DEFAULT auth.uid()
                              REFERENCES public.profiles (id) ON DELETE CASCADE,
    email       VARCHAR(255)  NOT NULL,          -- 답변 받을 이메일 (계정 이메일로 미리 채워주기)
    category    VARCHAR(20)   NOT NULL DEFAULT 'GENERAL'
                CHECK (category IN ('GENERAL', 'ACCOUNT', 'BUG', 'CHARACTER', 'SUGGESTION', 'OTHER')),
    title       VARCHAR(100)  NOT NULL CHECK (length(btrim(title)) > 0),
    content     TEXT          NOT NULL CHECK (length(btrim(content)) > 0 AND length(content) <= 3000),
    status      VARCHAR(15)   NOT NULL DEFAULT 'OPEN'
                CHECK (status IN ('OPEN', 'ANSWERED', 'CLOSED')),
    answer      TEXT,
    answered_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_inquiries_user_created ON public.inquiries (user_id, created_at DESC);
CREATE INDEX idx_inquiries_status       ON public.inquiries (status, created_at);

CREATE TRIGGER trg_inquiries_updated_at
    BEFORE UPDATE ON public.inquiries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------
-- 5. 일일 사용량 (KST 기준 하루 답변 횟수, LLM 비용 상한용) — 서버 전용
-- ---------------------------------------------------------------------
CREATE TABLE public.usage_counters (
    user_id     UUID  NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    usage_date  DATE  NOT NULL,
    reply_count INT   NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
    PRIMARY KEY (user_id, usage_date)
);

-- 한도 확인 + 증가를 한 문장으로 처리 (동시 요청에도 안전).
-- 반환: 증가 후 사용 횟수, 한도 초과면 NULL
CREATE OR REPLACE FUNCTION public.consume_reply_quota(p_user_id UUID, p_limit INT)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    INSERT INTO public.usage_counters AS u (user_id, usage_date, reply_count)
    VALUES (p_user_id, (now() AT TIME ZONE 'Asia/Seoul')::date, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET reply_count = u.reply_count + 1
    WHERE u.reply_count < p_limit
    RETURNING reply_count;
$$;

-- LLM 호출 실패 시 1 되돌리기
CREATE OR REPLACE FUNCTION public.refund_reply_quota(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    UPDATE public.usage_counters
       SET reply_count = reply_count - 1
     WHERE user_id = p_user_id
       AND usage_date = (now() AT TIME ZONE 'Asia/Seoul')::date
       AND reply_count > 0;
$$;


-- =====================================================================
-- 6. 권한 & RLS
-- =====================================================================
-- Supabase는 public 테이블에 anon/authenticated 권한을 기본 부여하므로 먼저 전부 회수
REVOKE ALL ON public.profiles, public.chat_rooms, public.messages, public.llm_calls,
              public.reports, public.inquiries, public.usage_counters
       FROM anon, authenticated;

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_calls        ENABLE ROW LEVEL SECURITY;   -- 정책 없음 = 서버 전용
ALTER TABLE public.reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters   ENABLE ROW LEVEL SECURITY;   -- 정책 없음 = 서버 전용

-- profiles: 본인 조회, 닉네임·마케팅 동의만 수정 가능 (role/status는 수정 불가)
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (nickname, marketing_agreed) ON public.profiles TO authenticated;

CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

-- chat_rooms / messages: 본인 것 조회만. 생성·저장은 서버(service role)
GRANT SELECT ON public.chat_rooms, public.messages TO authenticated;

CREATE POLICY chat_rooms_select_own ON public.chat_rooms
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY messages_select_own ON public.messages
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.chat_rooms r
         WHERE r.id = messages.room_id
           AND r.user_id = (SELECT auth.uid())
    ));

-- reports: 작성만 (처리 상태는 관리자/서버가 변경)
GRANT INSERT (message_id, category, memo) ON public.reports TO authenticated;

CREATE POLICY reports_insert_own ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = (SELECT auth.uid())
        AND (
            message_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.messages m
                  JOIN public.chat_rooms r ON r.id = m.room_id
                 WHERE m.id = reports.message_id
                   AND r.user_id = (SELECT auth.uid())
            )
        )
    );

-- inquiries: 본인 문의 작성·조회만 (status/answer는 관리자만 변경)
GRANT SELECT ON public.inquiries TO authenticated;
GRANT INSERT (email, category, title, content) ON public.inquiries TO authenticated;

CREATE POLICY inquiries_select_own ON public.inquiries
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY inquiries_insert_own ON public.inquiries
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- 함수 실행 권한: 기본 PUBLIC 실행 권한 회수 후 필요한 곳만 부여
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(TEXT, DATE, BOOLEAN) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.complete_onboarding(TEXT, DATE, BOOLEAN) TO authenticated;

-- 사용량 함수는 한도값을 인자로 받으므로 서버만 호출 가능해야 함
REVOKE EXECUTE ON FUNCTION public.consume_reply_quota(UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_reply_quota(UUID)       FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_reply_quota(UUID, INT) TO service_role;
GRANT  EXECUTE ON FUNCTION public.refund_reply_quota(UUID)       TO service_role;
