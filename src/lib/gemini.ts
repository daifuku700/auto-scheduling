import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from "@google/generative-ai";

// Gemini APIクライアントを初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ScheduleItem {
  title: string;
  details?: string;
  startDateTime?: string; // ISO形式の日時文字列
  endDateTime?: string;   // ISO形式の日時文字列
  dueDate?: string;       // ISO形式の日付文字列（タスクの場合）
  isAllDay?: boolean;
}

interface ImageData {
  mimeType: string;
  base64: string;
}

export async function extractSchedules(
  text?: string,
  imageData?: ImageData
): Promise<ScheduleItem[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Gemini API キーが設定されていません");
    throw new Error("API configuration error: Missing Gemini API key");
  }
  if (!text && !imageData) {
    throw new Error("テキストまたは画像のいずれかが必要です");
  }

  try {
    const modelName = "gemini-1.5-flash"; // マルチモーダル対応モデル
    console.log(`Gemini APIを使用: モデル=${modelName}`);

    const model = genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentDateTimeISO = now.toISOString();
    const currentDateTimeLocal = now.toLocaleString('ja-JP', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const japanOffset = 9 * 60;
    const currentOffset = -now.getTimezoneOffset();
    const offsetDifference = japanOffset - currentOffset;

    const promptText = `
以下の入力（テキストまたは画像）から予定やタスクを抽出し、JSONフォーマットで返してください。

現在の日時情報:
- 現在時刻（ISO）: ${currentDateTimeISO}
- 現在時刻（ローカル）: ${currentDateTimeLocal}
- タイムゾーン: ${timeZone}
- 日本時間との差: ${offsetDifference >= 0 ? '+' : '-'}${Math.abs(Math.floor(offsetDifference / 60))}時間${Math.abs(offsetDifference % 60)}分

抽出条件:
1. 日時情報があれば、ISO 8601フォーマット (YYYY-MM-DDThh:mm:ss+09:00) に変換してください。時間帯は日本時間 (JST) です。
2. 時間の記載がなければ、isAllDay を true にしてください。
3. 予定の日時が特定できる場合は startDateTime に、締め切りの場合は dueDate に設定してください。
4. 同じ予定やタスクが複数回出現する場合は、一度だけ抽出してください。
5. 具体的な日時情報がないものは抽出しないでください。
6. "今日", "明日", "昨日", "今週", "来週", "先週", "今月", "来月", "先月"などの相対的な日時表現は、現在日時（${currentDateTimeLocal}）を基準に適切な日時に変換してください。

出力形式（JSON配列）:
[
  {
    "title": "予定のタイトル",
    "details": "予定の詳細（あれば）",
    "startDateTime": "開始日時（ISO形式、イベントの場合）",
    "endDateTime": "終了日時（ISO形式、イベントの場合）",
    "dueDate": "締め切り日（ISO形式、タスクの場合）",
    "isAllDay": true/false
  },
  ...
]

予定やタスクが見つからない場合は、空の配列 [] を返してください。
`;

    const parts: Part[] = [{ text: promptText }];
    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.base64,
        },
      });
    } else if (text) {
      parts[0].text += `\n\n入力テキスト:\n"""\n${text}\n"""`;
    }

    try {
      console.log("Gemini API へのリクエスト開始");
      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      console.log("Gemini API からの応答を受信");

      const response = await result.response;
      const responseText = response.text();

      console.log("Gemini APIからの応答テキスト:", responseText.substring(0, 100) + "...");

      if (!responseText || responseText.trim() === '') {
        console.warn("Gemini APIからの応答が空です");
        return [];
      }

      try {
        // マークダウンのコードブロック記号を削除
        const cleanedText = responseText.replace(/```json|```/g, '').trim();
        console.log("整形後のJSONテキスト:", cleanedText.substring(0, 100) + "...");

        const parsedData = JSON.parse(cleanedText);

        if (!Array.isArray(parsedData)) {
          console.warn("APIレスポンスが配列でありません:", parsedData);
          if (typeof parsedData === 'object' && parsedData !== null && 'title' in parsedData) {
            return [parsedData as ScheduleItem];
          }
          return [];
        }

        const validSchedules = parsedData.filter(item => {
          return item && typeof item === 'object' && 'title' in item;
        });

        return validSchedules as ScheduleItem[];
      } catch (jsonError) {
        console.error("JSON解析エラー:", jsonError);
        console.error("API応答テキスト:", responseText);

        // エラーが発生した場合、さらに別の方法で抽出を試みる
        try {
          // JSONらしき部分を正規表現で抽出
          const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            const extractedJson = jsonMatch[0];
            console.log("正規表現で抽出したJSON:", extractedJson.substring(0, 100) + "...");
            const secondTryData = JSON.parse(extractedJson);

            if (Array.isArray(secondTryData)) {
              const validSchedules = secondTryData.filter(item => {
                return item && typeof item === 'object' && 'title' in item;
              });
              return validSchedules as ScheduleItem[];
            }
          }
        } catch (e) {
          console.error("二次的なJSON抽出も失敗:", e);
        }

        return [];
      }
    } catch (error) {
      console.error("Gemini API呼び出しエラー:", error);
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Gemini API呼び出しエラー:", error);
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
