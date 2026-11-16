-- =====================================================================
-- Seoulmate — 루비(유료 재화) 지갑
--
--  - 1루비 = 5000점. 점수 = 입력토큰 * 1 + 출력토큰(thinking 포함) * 8  (가중치는 코드 lib/billing에서 계산)
--  - 매 LLM 호출(REPLY, SUMMARY)마다 점수를 pending_points에 쌓고, 5000점이 찰 때마다 1루비 차감
--  - 무료 루비: 하루 p_free_daily개(KST 자정 기준). 다음 날로 넘어가지 않음. 무료 → 유료 순으로 차감
--    free_date가 오늘이 아니면 "오늘 무료 루비를 아직 안 채움" → 읽을 때/차감할 때 p_free_daily로 간주
--  - 지갑 행은 처음 차감/충전할 때 자동 생성 (기존 사용자 데이터 이전 불필요)
--  - 잔액이 모자라면 0에서 멈추고 나머지는 버림 (음수 잔액 없음)
--  - usage_counters / consume_reply_quota 는 아직 남겨둠 (코드 전환 후 별도 마이그레이션으로 삭제)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 지갑 (사용자당 1행) — 쓰기는 서버 함수로만
-- ---------------------------------------------------------------------
CREATE TABLE public.ruby_wallets (
    user_id        UUID         PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
    paid_balance   INT          NOT NULL DEFAULT 0 CHECK (paid_balance >= 0),   -- 충전한 루비
    free_balance   INT          NOT NULL DEFAULT 0 CHECK (free_balance >= 0),   -- 오늘 남은 무료 루비
    free_date      DATE,                                                         -- free_balance가 해당하는 날짜(KST)
    pending_points INT          NOT NULL DEFAULT 0 CHECK (pending_points BETWEEN 0 AND 4999),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ruby_wallets_updated_at
    BEFORE UPDATE ON public.ruby_wallets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------
-- 2. 루비 거래 내역 (추가만, 수정·삭제 없음)
--    USAGE는 실제로 루비가 빠진 호출만 기록 (점수만 쌓인 호출은 llm_calls.weighted_points로 확인)
--    탈퇴 후에도 매출·환불 대조용으로 남기고 user_id만 NULL
-- ---------------------------------------------------------------------
CREATE TABLE public.ruby_transactions (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id            UUID         REFERENCES public.profiles (id) ON DELETE SET NULL,
    type               VARCHAR(10)  NOT NULL
                       CHECK (type IN ('PURCHASE', 'USAGE', 'REFUND', 'ADMIN')),
    paid_delta         INT          NOT NULL DEFAULT 0,
    free_delta         INT          NOT NULL DEFAULT 0,
    paid_balance_after INT          NOT NULL,
    free_balance_after INT          NOT NULL,
    polar_order_id     TEXT,                    -- PURCHASE / REFUND
    llm_call_id        BIGINT       REFERENCES public.llm_calls (id) ON DELETE SET NULL,  -- USAGE
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- 같은 주문의 webhook이 여러 번 와도 한 번만 처리 (NULL끼리는 충돌하지 않음)
CREATE UNIQUE INDEX uq_ruby_transactions_order
    ON public.ruby_transactions (polar_order_id, type);
CREATE INDEX idx_ruby_transactions_user_created
    ON public.ruby_transactions (user_id, created_at DESC);


-- ---------------------------------------------------------------------
-- 3. llm_calls 과금 기록
-- ---------------------------------------------------------------------
ALTER TABLE public.llm_calls
    ADD COLUMN thought_tokens  INT,   -- Gemini thoughtsTokenCount (출력 요금으로 청구됨)
    ADD COLUMN weighted_points INT,   -- 이 호출의 가중 점수
    ADD COLUMN rubies_charged  INT;   -- 이 호출로 실제 차감된 루비 (대부분 0 또는 1)


-- ---------------------------------------------------------------------
-- 4. 함수 (모두 service role 전용)
-- ---------------------------------------------------------------------

-- 잔액 조회 (쓰기 없음). 오늘 무료 루비를 아직 안 채웠으면 p_free_daily로 보여줌
CREATE OR REPLACE FUNCTION public.get_ruby_wallet(p_user_id UUID, p_free_daily INT)
RETURNS TABLE (free_balance INT, paid_balance INT, pending_points INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT CASE WHEN w.free_date = (now() AT TIME ZONE 'Asia/Seoul')::date
                THEN w.free_balance ELSE p_free_daily END,
           w.paid_balance,
           w.pending_points
      FROM public.ruby_wallets w
     WHERE w.user_id = p_user_id
    UNION ALL
    SELECT p_free_daily, 0, 0
     WHERE NOT EXISTS (SELECT 1 FROM public.ruby_wallets w WHERE w.user_id = p_user_id);
$$;


-- LLM 호출 1회 과금: 점수 누적 → 5000점마다 1루비 차감 (무료 먼저, 그다음 유료)
-- p_llm_call_id가 있으면 llm_calls에 weighted_points / rubies_charged도 기록
CREATE OR REPLACE FUNCTION public.charge_ruby_usage(
    p_user_id     UUID,
    p_points      INT,
    p_free_daily  INT,
    p_llm_call_id BIGINT DEFAULT NULL
)
RETURNS TABLE (rubies_charged INT, free_balance INT, paid_balance INT, pending_points INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_today     DATE := (now() AT TIME ZONE 'Asia/Seoul')::date;
    v_wallet    public.ruby_wallets;
    v_free      INT;
    v_total     INT;
    v_due       INT;
    v_from_free INT;
    v_from_paid INT;
BEGIN
    IF p_points IS NULL OR p_points < 0 THEN
        RAISE EXCEPTION 'invalid points: %', p_points;
    END IF;

    INSERT INTO public.ruby_wallets (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- 동시 요청 직렬화
    SELECT * INTO v_wallet FROM public.ruby_wallets w WHERE w.user_id = p_user_id FOR UPDATE;

    v_free := CASE WHEN v_wallet.free_date = v_today THEN v_wallet.free_balance ELSE p_free_daily END;

    v_total     := v_wallet.pending_points + p_points;
    v_due       := v_total / 5000;
    v_from_free := LEAST(v_due, v_free);
    v_from_paid := LEAST(v_due - v_from_free, v_wallet.paid_balance);

    UPDATE public.ruby_wallets w
       SET free_balance   = v_free - v_from_free,
           free_date      = v_today,
           paid_balance   = v_wallet.paid_balance - v_from_paid,
           pending_points = v_total % 5000
     WHERE w.user_id = p_user_id;

    IF v_from_free + v_from_paid > 0 THEN
        INSERT INTO public.ruby_transactions
            (user_id, type, paid_delta, free_delta, paid_balance_after, free_balance_after, llm_call_id)
        VALUES
            (p_user_id, 'USAGE', -v_from_paid, -v_from_free,
             v_wallet.paid_balance - v_from_paid, v_free - v_from_free, p_llm_call_id);
    END IF;

    IF p_llm_call_id IS NOT NULL THEN
        UPDATE public.llm_calls c
           SET weighted_points = p_points,
               rubies_charged  = v_from_free + v_from_paid
         WHERE c.id = p_llm_call_id;
    END IF;

    RETURN QUERY SELECT v_from_free + v_from_paid,
                        v_free - v_from_free,
                        v_wallet.paid_balance - v_from_paid,
                        v_total % 5000;
END;
$$;


-- 유료 루비 충전 (Polar 결제 = PURCHASE, 수동 지급 = ADMIN)
-- 반환: 충전 후 유료 잔액. 이미 처리한 주문이면 NULL
CREATE OR REPLACE FUNCTION public.credit_rubies(
    p_user_id  UUID,
    p_amount   INT,
    p_order_id TEXT DEFAULT NULL,
    p_type     TEXT DEFAULT 'PURCHASE'
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_today  DATE := (now() AT TIME ZONE 'Asia/Seoul')::date;
    v_wallet public.ruby_wallets;
    v_tx_id  BIGINT;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'invalid amount: %', p_amount;
    END IF;
    IF p_type NOT IN ('PURCHASE', 'ADMIN') THEN
        RAISE EXCEPTION 'invalid type: %', p_type;
    END IF;
    IF p_type = 'PURCHASE' AND p_order_id IS NULL THEN
        RAISE EXCEPTION 'PURCHASE requires order id';
    END IF;

    INSERT INTO public.ruby_wallets (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_wallet FROM public.ruby_wallets w WHERE w.user_id = p_user_id FOR UPDATE;

    INSERT INTO public.ruby_transactions
        (user_id, type, paid_delta, free_delta, paid_balance_after, free_balance_after, polar_order_id)
    VALUES
        (p_user_id, p_type, p_amount, 0, v_wallet.paid_balance + p_amount,
         CASE WHEN v_wallet.free_date = v_today THEN v_wallet.free_balance ELSE 0 END,  -- 기록용 근사치
         p_order_id)
    ON CONFLICT (polar_order_id, type) DO NOTHING
    RETURNING id INTO v_tx_id;

    IF v_tx_id IS NULL THEN
        RETURN NULL;  -- 중복 webhook
    END IF;

    UPDATE public.ruby_wallets w
       SET paid_balance = v_wallet.paid_balance + p_amount
     WHERE w.user_id = p_user_id;

    RETURN v_wallet.paid_balance + p_amount;
END;
$$;


-- 결제 환불 시 유료 루비 회수 (이미 써버린 만큼은 0에서 멈춤)
-- 반환: 실제 회수한 루비. 이미 처리한 환불이면 NULL
CREATE OR REPLACE FUNCTION public.refund_rubies(p_user_id UUID, p_amount INT, p_order_id TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_today  DATE := (now() AT TIME ZONE 'Asia/Seoul')::date;
    v_wallet public.ruby_wallets;
    v_take   INT;
    v_tx_id  BIGINT;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 OR p_order_id IS NULL THEN
        RAISE EXCEPTION 'invalid refund: % %', p_amount, p_order_id;
    END IF;

    INSERT INTO public.ruby_wallets (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_wallet FROM public.ruby_wallets w WHERE w.user_id = p_user_id FOR UPDATE;

    v_take := LEAST(p_amount, v_wallet.paid_balance);

    INSERT INTO public.ruby_transactions
        (user_id, type, paid_delta, free_delta, paid_balance_after, free_balance_after, polar_order_id)
    VALUES
        (p_user_id, 'REFUND', -v_take, 0, v_wallet.paid_balance - v_take,
         CASE WHEN v_wallet.free_date = v_today THEN v_wallet.free_balance ELSE 0 END,
         p_order_id)
    ON CONFLICT (polar_order_id, type) DO NOTHING
    RETURNING id INTO v_tx_id;

    IF v_tx_id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE public.ruby_wallets w
       SET paid_balance = v_wallet.paid_balance - v_take
     WHERE w.user_id = p_user_id;

    RETURN v_take;
END;
$$;


-- =====================================================================
-- 5. 권한 & RLS
-- =====================================================================
REVOKE ALL ON public.ruby_wallets, public.ruby_transactions FROM anon, authenticated;

ALTER TABLE public.ruby_wallets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruby_transactions ENABLE ROW LEVEL SECURITY;

-- 본인 지갑·내역 조회만 (설정 화면 등). 쓰기는 아래 함수(service role)로만
GRANT SELECT ON public.ruby_wallets, public.ruby_transactions TO authenticated;

CREATE POLICY ruby_wallets_select_own ON public.ruby_wallets
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY ruby_transactions_select_own ON public.ruby_transactions
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

REVOKE EXECUTE ON FUNCTION public.get_ruby_wallet(UUID, INT)                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.charge_ruby_usage(UUID, INT, INT, BIGINT)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_rubies(UUID, INT, TEXT, TEXT)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_rubies(UUID, INT, TEXT)             FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_ruby_wallet(UUID, INT)                 TO service_role;
GRANT  EXECUTE ON FUNCTION public.charge_ruby_usage(UUID, INT, INT, BIGINT)  TO service_role;
GRANT  EXECUTE ON FUNCTION public.credit_rubies(UUID, INT, TEXT, TEXT)       TO service_role;
GRANT  EXECUTE ON FUNCTION public.refund_rubies(UUID, INT, TEXT)             TO service_role;
