"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

// セッションクリア用のユーティリティ関数
async function clearAllSessions() {
  try {
    // APIを呼び出してサーバーサイドでセッションをクリア
    await fetch('/api/clear-sessions', { method: 'POST' });

    // ブラウザ側のストレージをクリア
    localStorage.clear();
    sessionStorage.clear();

    // Google関連の認証Cookieを削除
    document.cookie.split(';').forEach(c => {
      const cookieName = c.split('=')[0].trim();
      if (cookieName.startsWith('G_') || cookieName === 'g_state') {
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    });
  } catch (error) {
    console.error('セッションクリアエラー:', error);
  }
}

// ログアウト検出と状態管理のためのコンポーネント
function SessionMonitor() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // セッションがnullになった場合（ログアウト時）の処理
    if (status === "unauthenticated") {
      clearAllSessions();
    }
  }, [status]);

  return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SessionMonitor />
      {children}
    </NextAuthSessionProvider>
  );
}
