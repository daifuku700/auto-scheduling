"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ScheduleItem } from "@/lib/gemini";
import { ExtractedScheduleList } from "@/components/ExtractedScheduleList";
import { ScheduleConfirmationModal } from "@/components/ScheduleConfirmationModal";

export function ScheduleInputForm() {
  const { data: session, status } = useSession();
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedSchedules, setExtractedSchedules] = useState<ScheduleItem[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);

  // セッション（ログイン状態）の変化を監視
  useEffect(() => {
    // ログアウトした場合
    if (status === "unauthenticated") {
      // 抽出された予定データをクリア
      setExtractedSchedules([]);
      setHasExtracted(false);

      // モーダルが開いていたら閉じる
      if (isModalOpen) {
        setIsModalOpen(false);
        setSelectedSchedule(null);
      }
    }
  }, [status, isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputText.trim()) {
      return;
    }

    if (!session) {
      alert("予定を登録するにはログインが必要です。");
      return;
    }

    setIsLoading(true);
    setExtractedSchedules([]);
    setHasExtracted(false);

    try {
      // APIを呼び出して予定を抽出
      const response = await fetch("/api/extract-schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      // レスポンスのテキストを取得
      const responseText = await response.text();

      // JSONとして解析
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("レスポンスのJSON解析に失敗:", parseError);
        console.error("受信したレスポンス:", responseText);
        throw new Error("サーバーからの応答を処理できませんでした。");
      }

      if (!response.ok) {
        throw new Error(data.error || "予定の抽出に失敗しました");
      }

      // データの形式を検証
      if (!data || !Array.isArray(data.schedules)) {
        console.error("不正なレスポンス形式:", data);
        throw new Error("サーバーから無効なデータ形式が返されました");
      }

      setExtractedSchedules(data.schedules);
      setHasExtracted(true);

      if (data.schedules.length === 0) {
        alert("テキストから予定を抽出できませんでした。具体的な日時情報を含むテキストを入力してください。");
      }
    } catch (error) {
      console.error("エラーが発生しました:", error);
      alert(`予定の抽出中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setExtractedSchedules([]);
    setHasExtracted(false);
  };

  const handleScheduleClick = (schedule: ScheduleItem) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  const handleUpdateSchedule = (updatedSchedule: ScheduleItem) => {
    setExtractedSchedules(extractedSchedules.map(schedule =>
      schedule === selectedSchedule ? updatedSchedule : schedule
    ));
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">予定テキスト入力</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="scheduleText" className="block text-sm font-medium text-gray-700 mb-2">
            予定が含まれたテキストを入力してください
          </label>
          <textarea
            id="scheduleText"
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例: 明日の13時から14時まで会議があります。金曜日までにレポートを提出する必要があります。"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading || !session}
          />
          <p className="mt-2 text-sm text-gray-500">
            入力されたテキストから予定を抽出し、Google Calendar や Google Tasks に登録します。
          </p>
        </div>

        <div className="flex justify-end gap-3">
          {hasExtracted && (
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              onClick={handleReset}
            >
              リセット
            </button>
          )}
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium
              ${!session
                ? 'bg-gray-400 cursor-not-allowed'
                : isLoading
                  ? 'bg-blue-400 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            disabled={isLoading || !session}
          >
            {isLoading ? '処理中...' : '予定を抽出'}
          </button>
        </div>

        {!session && (
          <p className="mt-4 text-sm text-orange-600">
            予定を登録するには、まずGoogle アカウントでログインしてください。
          </p>
        )}
      </form>

      {hasExtracted && (
        <ExtractedScheduleList
          schedules={extractedSchedules}
          onScheduleClick={handleScheduleClick}
        />
      )}

      {isModalOpen && selectedSchedule && (
        <ScheduleConfirmationModal
          schedule={selectedSchedule}
          onClose={handleCloseModal}
          onUpdate={handleUpdateSchedule}
        />
      )}
    </div>
  );
}
