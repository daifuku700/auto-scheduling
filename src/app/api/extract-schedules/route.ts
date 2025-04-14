import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractSchedules, ScheduleItem } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        const body = await req.json().catch(e => {
            console.error("リクエスト本文の解析エラー:", e);
            return null;
        });

        if (!body) {
            return NextResponse.json({ error: "無効なリクエスト形式です" }, { status: 400 });
        }

        const { text, imageData } = body;

        if (!text && !imageData) {
            return NextResponse.json({ error: "テキストまたは画像データが必要です" }, { status: 400 });
        }
        if (imageData && (!imageData.mimeType || !imageData.base64)) {
            return NextResponse.json({ error: "画像データ形式が無効です" }, { status: 400 });
        }

        // Gemini APIを使って予定を抽出
        const schedules: ScheduleItem[] = await extractSchedules(text, imageData);

        return NextResponse.json({ schedules });
    } catch (error) {
        console.error("予定抽出API処理エラー:", error);
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
