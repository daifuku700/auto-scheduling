import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

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

export async function extractSchedules(text: string): Promise<ScheduleItem[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Gemini API キーが設定されていません");
    throw new Error("API configuration error: Missing Gemini API key");
  }

  try {
    // 最新のモデル名を使用 - バージョン指定を変更
    // 'gemini-pro'ではなく'gemini-1.5-flash'などの最新モデルに変更
    // まずはAPIで利用可能なモデルを確認
    const modelName = "gemini-1.5-flash"; // 最新の安定版モデル名
    console.log(`Gemini APIを使用: モデル=${modelName}`);

    // モデルの取得と設定
    const model = genAI.getGenerativeModel({
      model: modelName,
      // セーフティ設定を追加
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
      generationConfig: {
        temperature: 0.2,  // より確定的な応答
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    // 現在の日時とタイムゾーン情報を取得
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

    // 日本のタイムゾーンオフセットを取得（分単位）
    const japanOffset = 9 * 60; // JST: UTC+9
    const currentOffset = -now.getTimezoneOffset(); // 分単位でのオフセット（負の値なので反転）
    const offsetDifference = japanOffset - currentOffset; // 日本時間との差（分）

    // プロンプトを作成
    const prompt = `
以下のテキストから予定やタスクを抽出し、JSONフォーマットで返してください。

現在の日時情報:
- 現在時刻（ISO）: ${currentDateTimeISO}
- 現在時刻（ローカル）: ${currentDateTimeLocal}
- タイムゾーン: ${timeZone}
- 日本時間との差: ${offsetDifference >= 0 ? '+' : '-'}${Math.abs(Math.floor(offsetDifference / 60))}時間${Math.abs(offsetDifference % 60)}分

入力テキスト:
"""
${text}
"""

以下の条件に従って抽出してください:
1. 日時情報があれば、ISO 8601フォーマット (YYYY-MM-DDThh:mm:ss+09:00) に変換してください。時間帯は日本時間 (JST) です。
2. 時間の記載がなければ、isAllDay を true にしてください。
3. 予定の日時が特定できる場合は startDateTime に、締め切りの場合は dueDate に設定してください。
4. 同じ予定やタスクが複数回出現する場合は、一度だけ抽出してください。
5. 具体的な日時情報がないものは抽出しないでください。
6. "今日", "明日", "昨日", "今週", "来週", "先週", "今月", "来月", "先月"などの相対的な日時表現は、現在日時（${currentDateTimeLocal}）を基準に適切な日時に変換してください。

出力形式:
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

空の配列 [] が返る場合は、予定やタスクが見つからなかったことを意味します。
必ず有効なJSONフォーマットで返してください。
レスポンスは必ず一行に一つのJSONオブジェクトを持つ配列としてください。
`;

    try {
      // エラーハンドリングを強化
      console.log("Gemini API へのリクエスト開始");

      // Gemini APIを呼び出し
      const result = await model.generateContent(prompt);
      console.log("Gemini API からの応答を受信");

      const response = await result.response;
      const responseText = response.text();

      console.log("Gemini APIからの応答テキスト:", responseText.substring(0, 100) + "...");

      // 空の応答をチェック
      if (!responseText || responseText.trim() === '') {
        console.warn("Gemini APIからの応答が空です");
        return [];
      }

      // JSON文字列を抽出（マークダウンコードブロックから取り出す処理も含む）
      let jsonStr = responseText;

      // コードブロックを検出して取り除く
      const codeBlockMatch = responseText.match(/```(?:json)?([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
      // 配列表記の場合の処理
      else {
        const arrayMatch = responseText.match(/\[([\s\S]*)\]/);
        if (arrayMatch) {
          jsonStr = `[${arrayMatch[1]}]`;
        }
      }

      try {
        // JSON文字列をパースし、ScheduleItem[]型に変換
        console.log("JSONの解析を試行:", jsonStr.substring(0, 100) + "...");

        // 特殊なJSON文字列のクリーンアップ
        const cleanJsonStr = jsonStr
          .replace(/```json|```/g, '').trim();
        const parsedData = JSON.parse(cleanJsonStr);

        // 配列でなければ空配列を返す
        if (!Array.isArray(parsedData)) {
          console.warn("APIレスポンスが配列でありません:", parsedData);
          return [];
        }

        // 各項目が必要なプロパティを持っているか検証
        const validSchedules = parsedData.filter(item => {
          return item && typeof item === 'object' && 'title' in item;
        });

        return validSchedules as ScheduleItem[];
      } catch (jsonError) {
        console.error("JSON解析エラー:", jsonError);
        console.error("API応答テキスト:", text);
        console.error("抽出されたJSON文字列:", jsonStr);
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
