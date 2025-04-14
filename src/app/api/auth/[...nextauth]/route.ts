import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// カスタム処理を追加するためのハンドラーラッパー
async function handler(req: NextRequest, context: any) {
    // ログアウト後の処理
    if (req.method === "POST" && req.url.includes("/signout")) {
        // NextAuthのハンドラーを呼び出す
        const response = await NextAuth(authOptions)(req, context);

        // レスポンスにセッションクリアのためのSet-Cookieヘッダーを追加
        response.headers.append("Set-Cookie", "next-auth.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly");
        response.headers.append("Set-Cookie", "__Secure-next-auth.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure");

        // Google認証セッションをクリアするためのCookieも削除
        response.headers.append("Set-Cookie", "g_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");

        return response;
    }

    return await NextAuth(authOptions)(req, context);
}

export { handler as GET, handler as POST };
