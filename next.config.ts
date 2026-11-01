import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // 캐릭터 이미지 (Cloudflare R2 공개 버킷). 커스텀 도메인 연결 시 여기에 추가
    remotePatterns: [{ protocol: "https", hostname: "*.r2.dev", pathname: "/characters/**" }],
  },
  // PostHog 리버스 프록시: /ingest/* → PostHog (광고 차단기 우회)
  async rewrites() {
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    // us.i.posthog.com → us-assets.i.posthog.com
    const assetsHost = host.replace(".i.posthog.com", "-assets.i.posthog.com");
    return [
      { source: "/ingest/static/:path*", destination: `${assetsHost}/static/:path*` },
      { source: "/ingest/:path*", destination: `${host}/:path*` },
    ];
  },
  // PostHog API 경로는 끝 슬래시가 붙어 있어 리다이렉트되면 안 됨
  skipTrailingSlashRedirect: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
