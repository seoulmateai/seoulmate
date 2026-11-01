-- =====================================================================
-- Seoulmate — 구독 (Stripe)
--
--  - 사용자당 1행. 행 생성은 Checkout 시작 시(Stripe 고객 생성), 이후 상태는
--    webhook → lib/billing/sync.ts 가 Stripe에서 구독을 다시 조회해 upsert
--  - 쓰기는 서버(service role)만. 클라이언트는 본인 행 조회만
--  - livemode: 테스트 모드(sk_test_)에서 만든 행이 라이브 키로 바뀐 뒤에도
--    구독으로 인정되지 않도록 기록 (lib/billing/subscription.ts에서 비교)
--  - 회원 탈퇴 시 profiles cascade로 삭제 (Stripe 구독 취소는 탈퇴 API가 먼저 처리)
-- =====================================================================

CREATE TABLE public.subscriptions (
    user_id                UUID         PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
    stripe_customer_id     TEXT         NOT NULL UNIQUE,
    stripe_subscription_id TEXT         UNIQUE,
    -- Stripe Subscription.status 그대로 (active, trialing, past_due, canceled, ...).
    -- Stripe가 값을 추가할 수 있어 CHECK 없음. NULL = 고객만 만들고 아직 구독 전
    status                 TEXT,
    price_id               TEXT,
    current_period_end     TIMESTAMPTZ,
    cancel_at_period_end   BOOLEAN      NOT NULL DEFAULT FALSE,
    livemode               BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 권한 & RLS: 본인 조회만, 쓰기는 service role
REVOKE ALL ON public.subscriptions FROM anon, authenticated;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.subscriptions TO authenticated;

CREATE POLICY subscriptions_select_own ON public.subscriptions
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
