# 自動予定登録アプリ

このアプリケーションは、テキスト入力から予定を自動抽出し、Google Calendar や Google Tasks に登録するツールです。

## 機能

- Google ログイン認証
- テキストからの予定自動抽出 (Gemini AI API 使用)
- 抽出された予定の確認と編集
- Google Calendar / Google Tasks への予定登録

## 開発環境のセットアップ

### 必要な環境変数

以下の環境変数を `.env.local` ファイルに設定してください：

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<任意の安全なシークレット>
GOOGLE_CLIENT_ID=<GoogleのOAuthクライアントID>
GOOGLE_CLIENT_SECRET=<GoogleのOAuthクライアントシークレット>
GEMINI_API_KEY=<Google Gemini APIキー>
```

### Google API の有効化

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、プロジェクトを作成または選択します。
2. 「APIとサービス」 > 「ライブラリ」に移動し、Google Calendar API と Google Tasks API を有効にします。
3. 「認証情報」タブに移動し、OAuth 2.0 クライアントIDを作成します。
4. 作成したクライアントIDとクライアントシークレットを `.env.local` ファイルに設定します。

### 開発サーバーの起動

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて利用できます。

## 技術スタック

- Next.js 15
- React 19
- NextAuth.js
- Gemini API
- TailwindCSS
- TypeScript
