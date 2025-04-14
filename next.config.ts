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
  // APIのタイムアウト設定を増加
  experimental: {
    serverComponentsExternalPackages: [],
    serverActions: {
      bodySizeLimit: '2mb', // APIリクエスト本文のサイズ制限を増やす
    },
  },
};

export default nextConfig;
