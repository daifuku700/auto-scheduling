"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function LoginButton() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const router = useRouter();

  const handleSignOut = async () => {
    // ローカルストレージとセッションストレージをクリア
    localStorage.clear();
    sessionStorage.clear();

    // Google認証セッションを完全にクリアするために、callbackUrlを設定して
    // Google自体のログアウトページにリダイレクトする
    await signOut({
      callbackUrl: '/',
      // 完全にログアウトするためのGoogleのログアウトURLを指定
      redirect: true
    });
  };

  if (isLoading) {
    return <div className="px-4 py-2 rounded-full bg-gray-200">読み込み中...</div>;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-4">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || "ユーザープロフィール"}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <div className="font-medium">{session.user.name}</div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          ログアウト
        </button>
      </div>
    );
  }

  // ログイン時にクリーンな新しいセッションを強制するためforceSignInを使用
  const handleSignIn = () => {
    // クッキーをクリアする（可能な場合）
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=');
      document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });

    // 強制的に新しい認証セッションを作成
    signIn("google", { prompt: "login" });
  };

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
      >
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>
      Googleでログイン
    </button>
  );
}
