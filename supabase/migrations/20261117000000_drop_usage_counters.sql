-- =====================================================================
-- Seoulmate — 하루 답변 횟수 한도 제거
--
--  - 채팅 과금을 루비(20261116000000_rubies.sql)로 바꾸면서 더 이상 쓰지 않음
--    (app/api/chat/route.ts는 get_ruby_wallet / charge_ruby_usage 사용)
--  - 하루 무료 사용량은 ruby_wallets.free_balance(하루 무료 루비)가 대신함
-- =====================================================================

DROP FUNCTION IF EXISTS public.consume_reply_quota(UUID, INT);
DROP FUNCTION IF EXISTS public.refund_reply_quota(UUID);
DROP TABLE IF EXISTS public.usage_counters;
