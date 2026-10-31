import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // 캐릭터 이미지 (Cloudflare R2 공개 버킷). 커스텀 도메인 연결 시 여기에 추가
    remotePatterns: [{ protocol: "https", hostname: "*.r2.dev", pathname: "/characters/**" }],
  },
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
