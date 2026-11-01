import "server-only";

import { after } from "next/server";
import { PostHog } from "posthog-node";

// 서버에서는 프록시 없이 PostHog로 바로 전송
let client: PostHog | null | undefined;

function getClient() {
  if (client === undefined) {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    client = key ? new PostHog(key, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST }) : null;
  }
  return client;
}

/**
 * 서버 이벤트 기록. 응답을 보낸 뒤(after) 즉시 전송하므로 응답 속도에 영향 없음.
 * Route Handler / Server Action 안에서만 호출할 것.
 * distinctId는 클라이언트 identify와 같은 Supabase user.id를 사용.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  const posthog = getClient();
  if (!posthog) return;
  after(() =>
    posthog
      .captureImmediate({ distinctId, event, properties })
      .catch((e) => console.error(`[posthog] capture ${event} failed`, e)),
  );
}
