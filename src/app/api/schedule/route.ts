import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCalendarEvent, createTask } from "@/lib/googleApis";
import { ScheduleItem } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        // セッション確認
        const session = await getServerSession(authOptions);

        if (!session || !session.accessToken) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        const body = await req.json();
        const { schedule, destination } = body;

        if (!schedule || !destination) {
            return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
        }

        // 選択に応じてイベントまたはタスクを作成
        let result;
        try {
            if (destination === "calendar") {
                result = await createCalendarEvent(session.accessToken, schedule);
            } else if (destination === "tasks") {
                result = await createTask(session.accessToken, schedule);
            } else {
                return NextResponse.json({ error: "無効な登録先です" }, { status: 400 });
            }
        } catch (apiError: any) {
            // API 有効化エラーの特別処理
            if (apiError.message && apiError.message.includes("API が有効化されていません")) {
                return NextResponse.json(
                    { error: apiError.message },
                    { status: 403 }
                );
            }
            throw apiError;
        }

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error("予定登録エラー:", error);
        const errorMessage = error instanceof Error ? error.message : "不明なエラー";
        return NextResponse.json(
            { error: "予定の登録に失敗しました", details: errorMessage },
            { status: 500 }
        );
    }
}
