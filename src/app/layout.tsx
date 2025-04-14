import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "自動予定登録アプリ",
  description: "テキスト入力から自動で予定を登録するアプリ",
  // キャッシュ関連のメタタグを追加
  other: {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* Google認証関連のキャッシュを無効化するためのメタタグ */}
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate, proxy-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>

        {/* Google認証関連のクライアントサイドセッションをクリアするためのスクリプト */}
        <Script id="clear-google-session" strategy="beforeInteractive">
          {`
            function clearGoogleSession() {
              try {
                if (typeof window !== 'undefined') {
                  // Google関連の認証状態をクリア
                  if (window.google && window.google.accounts && window.google.accounts.id) {
                    window.google.accounts.id.disableAutoSelect();
                  }
                }
              } catch (e) {
                console.error("Google session clearing error:", e);
              }
            }
            // ページロード時に実行
            clearGoogleSession();
          `}
        </Script>
      </body>
    </html>
  );
}
