import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractSchedules, ScheduleItem } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        // セッション確認（認証済みかチェック）
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        // リクエストボディからテキストを取得
        const body = await req.json().catch(e => {
            console.error("リクエスト本文の解析エラー:", e);
            return null;
        });

        if (!body || !body.text || typeof body.text !== "string") {
            return NextResponse.json({ error: "無効なリクエスト形式です" }, { status: 400 });
        }

        const { text } = body;

        // Gemini APIを使って予定を抽出
        const schedules: ScheduleItem[] = await extractSchedules(text);

        // 結果を返す
        return NextResponse.json({ schedules });
    } catch (error) {
        console.error("予定抽出API処理エラー:", error);

        // エラーの詳細情報を含めた応答
        const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
        return NextResponse.json(
            {
                error: "予定の抽出中にエラーが発生しました",
                details: errorMessage,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
