import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const response = NextResponse.json({ success: true });

    // すべての認証関連Cookieを削除
    const cookiesToClear = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        '__Secure-next-auth.callback-url',
        '__Host-next-auth.csrf-token',
        'next-auth.csrf-token',
        'g_state',
        'G_AUTHUSER_H',
        'G_ENABLED_IDPS'
    ];

    cookiesToClear.forEach(cookieName => {
        // 通常のクッキー
        response.headers.append("Set-Cookie", `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`);
        // セキュアクッキー
        response.headers.append("Set-Cookie", `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure`);
    });

    return response;
}
