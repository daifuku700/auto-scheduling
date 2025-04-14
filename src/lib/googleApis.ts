import { ScheduleItem } from "./gemini";

// Google Calendar APIでイベントを作成
export async function createCalendarEvent(accessToken: string, scheduleItem: ScheduleItem): Promise<any> {
    try {
        const event = {
            summary: scheduleItem.title,
            description: scheduleItem.details || "",
            start: scheduleItem.isAllDay
                ? { date: scheduleItem.startDateTime?.split('T')[0] }
                : { dateTime: scheduleItem.startDateTime, timeZone: 'Asia/Tokyo' },
            end: scheduleItem.isAllDay
                ? { date: (scheduleItem.endDateTime?.split('T')[0] || scheduleItem.startDateTime?.split('T')[0]) }
                : {
                    dateTime: scheduleItem.endDateTime || addHoursToIsoString(scheduleItem.startDateTime || "", 1),
                    timeZone: 'Asia/Tokyo'
                }
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }

            // Google API が有効化されていないエラーの場合、より親切なメッセージを提供
            if (response.status === 403 && errorData?.error?.status === "PERMISSION_DENIED") {
                const serviceInfo = errorData?.error?.details?.find((d: any) => d['@type']?.includes('ErrorInfo'));
                const activationUrl = serviceInfo?.metadata?.activationUrl;

                if (activationUrl) {
                    throw new Error(`
            Google Calendar API が有効化されていません。
            以下の URL から API を有効化してください:
            ${activationUrl}

            API を有効化したあと、数分待ってから再度お試しください。
          `);
                }
            }

            throw new Error(`Calendar API error: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("カレンダーイベント作成エラー:", error);
        throw error;
    }
}

// Google Tasks APIでタスクを作成
export async function createTask(accessToken: string, scheduleItem: ScheduleItem): Promise<any> {
    try {
        const task = {
            title: scheduleItem.title,
            notes: scheduleItem.details || "",
            due: scheduleItem.dueDate || scheduleItem.startDateTime
        };

        // まず、タスクリストを取得
        const listsResponse = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!listsResponse.ok) {
            const errorText = await listsResponse.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }

            // Google API が有効化されていないエラーの場合、より親切なメッセージを提供
            if (listsResponse.status === 403 && errorData?.error?.status === "PERMISSION_DENIED") {
                const serviceInfo = errorData?.error?.details?.find((d: any) => d['@type']?.includes('ErrorInfo'));
                const activationUrl = serviceInfo?.metadata?.activationUrl;

                if (activationUrl) {
                    throw new Error(`
            Google Tasks API が有効化されていません。
            以下の URL から API を有効化してください:
            ${activationUrl}

            API を有効化したあと、数分待ってから再度お試しください。
          `);
                }
            }

            throw new Error(`Tasks API error: ${listsResponse.status}`);
        }

        const listsData = await listsResponse.json();
        const defaultTaskList = listsData.items?.[0]?.id;

        if (!defaultTaskList) {
            throw new Error('タスクリストが見つかりません');
        }

        // タスクを作成
        const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultTaskList}/tasks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Tasks API error: ${response.status} ${errorData}`);
        }

        return await response.json();
    } catch (error) {
        console.error("タスク作成エラー:", error);
        throw error;
    }
}

// ユーティリティ関数
function addHoursToIsoString(isoString: string, hours: number): string {
    if (!isoString) return "";

    const date = new Date(isoString);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
}
