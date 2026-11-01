import posthog from "posthog-js";

// 앱이 interactive 되기 전에 PostHog 초기화 (Next.js instrumentation-client 규칙)
// 이벤트는 /ingest 프록시(next.config.ts rewrites)로 보내 광고 차단기에 막히지 않게 함
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host: "/ingest",
    // 툴바·세션 리플레이 링크 등이 열릴 PostHog 앱 주소 (us.i.posthog.com → us.posthog.com)
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(".i.posthog.com", ".posthog.com"),
    // 페이지뷰(App Router 이동 포함)·페이지 이탈 자동 수집 등 최신 기본값
    defaults: "2026-08-30",
    // 로그인(identify)한 사용자만 person 프로필 생성
    person_profiles: "identified_only",
  });
}
