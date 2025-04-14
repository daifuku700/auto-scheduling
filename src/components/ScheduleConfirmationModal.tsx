"use client";

import { useState, useEffect, useRef } from "react";
import { ScheduleItem } from "@/lib/gemini";
import { ScheduleDestinationSelector } from "./ScheduleDestinationSelector";

interface ScheduleConfirmationModalProps {
  schedule: ScheduleItem;
  onClose: () => void;
  onUpdate: (updatedSchedule: ScheduleItem) => void;
}

export function ScheduleConfirmationModal({
  schedule,
  onClose,
  onUpdate
}: ScheduleConfirmationModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedSchedule, setEditedSchedule] = useState<ScheduleItem>({ ...schedule });
  const [showDestinationSelector, setShowDestinationSelector] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // 日付フォーマット変換ヘルパー関数
  const formatDateForInput = (dateTimeStr?: string): string => {
    if (!dateTimeStr) return "";

    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return "";

      // ISO文字列から "YYYY-MM-DDThh:mm" の形式に変換
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error("日付フォーマットエラー:", error);
      return "";
    }
  };

  // モーダル外クリックで閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // ESCキーで閉じる処理
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onClose]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "isAllDay") {
      setEditedSchedule({
        ...editedSchedule,
        isAllDay: (e.target as HTMLInputElement).checked,
      });
    } else if (name === "scheduleType") {
      // scheduleTypeは実際にはDBに保存せず、UIの表示制御のみに使用
      if (value === "event") {
        // イベントタイプの場合は開始と終了時間を設定し、期限をクリア
        setEditedSchedule({
          ...editedSchedule,
          startDateTime: editedSchedule.startDateTime || new Date().toISOString(),
          dueDate: undefined
        });
      } else {
        // タスクタイプの場合は期限を設定し、開始と終了時間をクリア
        setEditedSchedule({
          ...editedSchedule,
          dueDate: editedSchedule.dueDate || new Date().toISOString(),
          startDateTime: undefined,
          endDateTime: undefined
        });
      }
    } else {
      setEditedSchedule({
        ...editedSchedule,
        [name]: value,
      });
    }
  };

  const handleSubmit = () => {
    onUpdate(editedSchedule);
  };

  const handleRegisterClick = () => {
    setShowDestinationSelector(true);
  };

  const handleRegistrationSuccess = (result: any) => {
    setRegistrationStatus("success");
    setStatusMessage("予定を正常に登録しました！");
    setShowDestinationSelector(false);
    // 3秒後に閉じる
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const handleRegistrationError = (error: Error) => {
    setRegistrationStatus("error");
    setStatusMessage(`登録中にエラーが発生しました: ${error.message}`);
    setShowDestinationSelector(false);
  };

  // 予定のタイプを判別（UIのみの表示用）
  const scheduleType = editedSchedule.dueDate ? "task" : "event";

  // モーダルの表示内容
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {showDestinationSelector ? (
          <div className="p-5">
            <ScheduleDestinationSelector
              schedule={editedSchedule}
              onSuccess={handleRegistrationSuccess}
              onError={handleRegistrationError}
              onClose={() => setShowDestinationSelector(false)}
            />
          </div>
        ) : (
          <>
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editMode ? "予定を編集" : "予定の確認"}
              </h3>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setEditMode(true)}
                    title="編集"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                    </svg>
                  </button>
                )}
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={onClose}
                  title="閉じる"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5">
              {registrationStatus !== "idle" && (
                <div className={`mb-4 p-3 rounded-md ${registrationStatus === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                  }`}>
                  {statusMessage}
                </div>
              )}

              {editMode ? (
                // 編集モード
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タイプ
                    </label>
                    <select
                      name="scheduleType"
                      value={scheduleType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="event">イベント</option>
                      <option value="task">タスク</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タイトル
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={editedSchedule.title}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      詳細
                    </label>
                    <textarea
                      name="details"
                      value={editedSchedule.details || ""}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="isAllDay"
                      name="isAllDay"
                      checked={!!editedSchedule.isAllDay}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <label htmlFor="isAllDay" className="text-sm font-medium text-gray-700">
                      終日
                    </label>
                  </div>

                  {scheduleType === "event" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          開始日時
                        </label>
                        <input
                          type="datetime-local"
                          name="startDateTime"
                          value={formatDateForInput(editedSchedule.startDateTime)}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          終了日時
                        </label>
                        <input
                          type="datetime-local"
                          name="endDateTime"
                          value={formatDateForInput(editedSchedule.endDateTime)}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        期限日時
                      </label>
                      <input
                        type="datetime-local"
                        name="dueDate"
                        value={formatDateForInput(editedSchedule.dueDate)}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}
                </div>
              ) : (
                // 確認モード
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">タイプ:</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${schedule.dueDate ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {schedule.dueDate ? 'タスク' : 'イベント'}
                    </span>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">タイトル:</span>
                    <p className="text-gray-900 mt-1">{schedule.title}</p>
                  </div>

                  {schedule.details && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">詳細:</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-line">{schedule.details}</p>
                    </div>
                  )}

                  {schedule.isAllDay && (
                    <div className="flex items-center">
                      <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">終日</span>
                    </div>
                  )}

                  {!schedule.dueDate ? (
                    <>
                      <div>
                        <span className="text-sm font-medium text-gray-500">開始日時:</span>
                        <p className="text-gray-700 mt-1">
                          {schedule.startDateTime ? new Date(schedule.startDateTime).toLocaleString('ja-JP') : "未設定"}
                        </p>
                      </div>

                      {schedule.endDateTime && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">終了日時:</span>
                          <p className="text-gray-700 mt-1">
                            {new Date(schedule.endDateTime).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <span className="text-sm font-medium text-gray-500">期限日時:</span>
                      <p className="text-gray-700 mt-1">
                        {schedule.dueDate ? new Date(schedule.dueDate).toLocaleString('ja-JP') : "未設定"}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 text-sm bg-blue-50 p-3 rounded-md text-blue-800">
                    この予定情報は正確ですか？ 必要に応じて「編集」ボタンで修正できます。
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t flex justify-end gap-2">
              {editMode ? (
                <>
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setEditMode(false);
                      setEditedSchedule({ ...schedule });
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={handleSubmit}
                  >
                    更新
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    onClick={onClose}
                  >
                    閉じる
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={() => setEditMode(true)}
                  >
                    編集
                  </button>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    onClick={handleRegisterClick}
                    disabled={registrationStatus === "success"}
                  >
                    登録
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
