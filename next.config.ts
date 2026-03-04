import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /chat, /complete → 실제 라우트는 / (page.tsx)에서 처리
  // pushState로 URL만 변경하지만, 직접 접근 / 새로고침 시 404 방지
  async rewrites() {
    return [
      { source: '/chat', destination: '/' },
      { source: '/complete', destination: '/' },
    ];
  },
};

export default nextConfig;
