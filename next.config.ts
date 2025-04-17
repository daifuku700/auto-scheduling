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
  // ベースパス設定を追加
  basePath: '/auto-schedule',
  // 本番環境の設定
  output: 'standalone', // 依存関係を含めたスタンドアロンビルドを生成
};

export default nextConfig;
