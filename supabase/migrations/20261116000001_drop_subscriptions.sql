-- =====================================================================
-- Seoulmate — Stripe 구독 테이블 삭제
--
--  - feat/billing 브랜치(20261102100000_subscriptions.sql)에서 만든 테이블.
--    구독 대신 루비 충전 방식(20261116000000_rubies.sql)으로 바꾸면서 사용하지 않음
--  - 남아 있던 행은 Stripe 테스트 모드(livemode=false) 데이터뿐
--  - 적용 전 원격 migration 기록 정리:
--      npx supabase migration repair --status reverted 20261102100000
-- =====================================================================

DROP TABLE IF EXISTS public.subscriptions;
