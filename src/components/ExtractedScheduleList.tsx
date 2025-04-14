"use client";

import { ScheduleItem } from "@/lib/gemini";

// 日時のフォーマットヘルパー関数
function formatDateTime(dateTimeStr?: string, isAllDay?: boolean): string {
  if (!dateTimeStr) return isAllDay ? "終日" : "日時未定";
  const date = new Date(dateTimeStr);
  const options: Intl.DateTimeFormatOptions = isAllDay
    ? { year: "numeric", month: "long", day: "numeric" }
    : { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
  return new Intl.DateTimeFormat("ja-JP", options).format(date);
}

interface ExtractedScheduleListProps {
  schedules: ScheduleItem[];
  onScheduleClick: (schedule: ScheduleItem) => void;
}

export function ExtractedScheduleList({ schedules, onScheduleClick }: ExtractedScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <p className="text-gray-700">予定が見つかりませんでした。より具体的な日時情報を含むテキストを入力してください。</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-md font-semibold mb-3">抽出された予定</h3>
      <p className="text-sm text-gray-600 mb-4">各予定をクリックすると詳細を確認・編集できます</p>
      <div className="space-y-4">
        {schedules.map((schedule, index) => {
          // dueDateがあればタスク、そうでなければイベントとして扱う
          const isTask = !!schedule.dueDate;

          return (
            <div
              key={index}
              className={`p-4 rounded-md border-l-4 ${isTask ? 'border-l-amber-500 bg-amber-50' : 'border-l-blue-500 bg-blue-50'
                } cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => onScheduleClick(schedule)}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-gray-900">{schedule.title}</h4>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${isTask ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                    {isTask ? 'タスク' : 'イベント'}
                  </span>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onScheduleClick(schedule);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                    </svg>
                  </button>
                </div>
              </div>

              {schedule.details && (
                <p className="text-sm text-gray-600 mt-1">{schedule.details}</p>
              )}

              <div className="mt-2 text-sm text-gray-700">
                {isTask ? (
                  <p>期限: {formatDateTime(schedule.dueDate, schedule.isAllDay)}</p>
                ) : (
                  <>
                    <p>開始: {formatDateTime(schedule.startDateTime, schedule.isAllDay)}</p>
                    {schedule.endDateTime && (
                      <p>終了: {formatDateTime(schedule.endDateTime, schedule.isAllDay)}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
