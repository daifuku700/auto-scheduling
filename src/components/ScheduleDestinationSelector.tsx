"use client";

import { useState } from "react";
import { ScheduleItem } from "@/lib/gemini";

interface ScheduleDestinationSelectorProps {
    schedule: ScheduleItem;
    onSuccess: (result: any) => void;
    onError: (error: Error) => void;
    onClose?: () => void;
}

export function ScheduleDestinationSelector({
    schedule,
    onSuccess,
    onError,
    onClose
}: ScheduleDestinationSelectorProps) {
    // デフォルト選択 - dueDate が存在する場合は tasks、それ以外は calendar
    const [destination, setDestination] = useState<"calendar" | "tasks">(
        schedule.dueDate ? "tasks" : "calendar"
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiErrorInfo, setApiErrorInfo] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setApiErrorInfo(null);

        try {
            const response = await fetch("/api/schedule", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ schedule, destination }),
            });

            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("レスポンスのパースに失敗:", responseText);
                throw new Error("サーバーからの応答を解析できませんでした");
            }

            if (!response.ok) {
                // API有効化エラーの検出と表示
                if (data?.error?.includes("API が有効化されていません")) {
                    setApiErrorInfo(data.error);
                    throw new Error("Google API の有効化が必要です");
                }
                throw new Error(data.error || data.details || "予定の登録に失敗しました");
            }

            onSuccess(data);
        } catch (error) {
            console.error("予定登録中のエラー:", error);
            onError(error instanceof Error ? error : new Error("不明なエラー"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-4">
                「{schedule.title}」の登録先を選択
            </h3>

            {apiErrorInfo && (
                <div className="mb-4 p-3 border rounded-md bg-yellow-50 border-yellow-200 text-yellow-800 whitespace-pre-wrap">
                    <p className="font-medium mb-2">Google API の有効化が必要です</p>
                    <p className="text-sm">{apiErrorInfo}</p>
                    <p className="mt-2 text-sm">
                        リンク先のページで「有効にする」ボタンをクリックし、数分待ってから再度お試しください。
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-6">
                    <div className="flex items-center">
                        <input
                            id="calendar"
                            type="radio"
                            name="destination"
                            value="calendar"
                            checked={destination === "calendar"}
                            onChange={() => setDestination("calendar")}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label
                            htmlFor="calendar"
                            className="ml-2 block text-sm font-medium text-gray-700"
                        >
                            Google カレンダー（イベント）
                        </label>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="tasks"
                            type="radio"
                            name="destination"
                            value="tasks"
                            checked={destination === "tasks"}
                            onChange={() => setDestination("tasks")}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label
                            htmlFor="tasks"
                            className="ml-2 block text-sm font-medium text-gray-700"
                        >
                            Google タスク（To-Do）
                        </label>
                    </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                    {destination === "calendar"
                        ? "カレンダーに予定として登録します。日時情報を含む予定に最適です。"
                        : "タスクリストに ToDo として登録します。期限のあるタスクに最適です。"}
                </p>

                <div className="flex justify-end gap-2">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            キャンセル
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSubmitting
                            ? "bg-blue-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                            }`}
                    >
                        {isSubmitting ? "登録中..." : "登録する"}
                    </button>
                </div>
            </form>
        </div>
    );
}
