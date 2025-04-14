import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // API関連の設定のみ残す
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // APIリクエスト本文のサイズ制限を増やす
    },
  },
};

export default nextConfig;
