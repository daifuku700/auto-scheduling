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

### Google API の有効化と設定（詳細手順・確認事項）

**重要:** エラーメッセージに表示されているプロジェクトID `992503895394` で以下の設定を行ってください。

1.  **Google Cloud Console へのアクセスとプロジェクト選択**
    *   [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、Googleアカウントでログインします。
    *   画面上部のプロジェクト選択メニューをクリックし、**必ずプロジェクトID `992503895394` のプロジェクトを選択**してください。もしリストにない場合は、組織を選択するか、IDで検索してください。

2.  **必要な API の有効化**
    *   左側のナビゲーションメニュー（ハンバーガーアイコン☰）を開き、「APIとサービス」→「ライブラリ」を選択します。
    *   **Google Calendar API**:
        *   検索バーに `Google Calendar API` と入力し、表示されたAPIをクリックします。
        *   「有効にする」ボタンが表示されていればクリックします。「管理」ボタンが表示されていれば、既に有効です。
    *   **Google Tasks API**:
        *   同様に `Tasks API` を検索し、表示されたAPIをクリックします。
        *   「有効にする」ボタンが表示されていればクリックします。

3.  **API 有効化の確認と待機**
    *   左側のメニューで「APIとサービス」→「有効なAPIとサービス」を選択します。
    *   リストに「Google Calendar API」と「Tasks API」が表示されていることを確認します。
    *   **重要:** APIを有効化した後、設定がシステム全体に反映されるまで**最大5分程度**かかることがあります。すぐに試してエラーが出る場合は、少し時間をおいてください。

4.  **OAuth 同意画面の設定確認**
    *   左側のメニューで「APIとサービス」→「OAuth 同意画面」を選択します。
    *   **公開ステータス:** 「テスト中」になっていることを確認します。（本番環境にする場合は追加の検証が必要です）
    *   **ユーザーの種類:** 「外部」が選択されていることを確認します。
    *   **アプリ登録の編集:**
        *   アプリ名、ユーザーサポートメール、デベロッパー連絡先情報が入力されていることを確認します。
    *   **スコープの確認:**
        *   「スコープ」セクションで、「スコープを追加または削除」をクリックし、以下のスコープが**すべて**追加されていることを確認します。不足している場合は追加してください。
            *   `.../auth/userinfo.email` (openid)
            *   `.../auth/userinfo.profile` (profile)
            *   `.../auth/calendar` (Google Calendar API)
            *   `.../auth/tasks` (Tasks API)
    *   **テストユーザーの確認:**
        *   「テストユーザー」セクションで、アプリケーションを使用するGoogleアカウント（あなたのアカウント）のメールアドレスが追加されていることを確認します。

5.  **認証情報の確認**
    *   左側のメニューで「APIとサービス」→「認証情報」を選択します。
    *   「OAuth 2.0 クライアント ID」セクションで、使用しているクライアントID（通常は「ウェブ クライアント」）をクリックします。
    *   **承認済みのリダイレクト URI:** `http://localhost:3000/api/auth/callback/google` が正しく登録されていることを確認します。
    *   **クライアント ID とシークレット:** 表示されているクライアントIDとシークレットが、`.env.local` ファイル内の `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` と一致していることを確認します。

6.  **アプリケーションの再認証と再起動**
    *   Google Cloud Consoleで設定を変更した場合、アプリケーションで一度ログアウトし、再度ログインしてGoogleアカウントのアクセス許可を再承認してください。
    *   環境変数 (`.env.local`) を変更した場合は、開発サーバーを再起動します (`Ctrl+C` で停止後、`npm run dev`)。

### トラブルシューティング

#### Google API の有効化エラーが表示される場合

1. Google Cloud Console で API が正しく有効になっていることを確認します
2. API 有効化後は、変更が反映されるまで5分以上待ちます
3. ブラウザからアプリに再度ログインし直してみてください
4. OAuth 同意画面で必要なスコープがすべて追加されていることを確認します

#### アクセス権限のエラーが表示される場合

1. OAuth 同意画面のテストユーザーにあなたのアカウントが追加されているか確認します
2. OAuth クライアント ID の設定で、リダイレクト URI が正しいか確認します
3. `.env.local` ファイルのクライアント ID とシークレットが最新かつ正確か確認します

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

## 本番環境へのデプロイ

### Ubuntu Server + Apache2 へのデプロイ

#### 前提条件
- Ubuntu Server (推奨: 20.04 LTS 以降)
- Apache2
- Node.js 18.x 以上
- npm または yarn
- PM2 (Node.jsアプリケーション管理用)

#### デプロイ手順

1. **リポジトリのクローン**
   ```bash
   git clone <リポジトリURL>
   cd auto-scheduling
   ```

2. **環境変数の設定**
   - `.env.local.example` をコピーして `.env.local` を作成
   - 必要な環境変数を設定（Google API キーなど）

3. **Makefileを使ったデプロイ**

   すべてのセットアップとデプロイを自動で行う場合:
   ```bash
   sudo make all
   ```

   または個別のステップを実行:
   ```bash
   # サーバーの依存関係をインストール
   sudo make setup-server

   # Node.js の依存関係をインストール
   make install-deps

   # アプリケーションのビルド
   make build

   # Apacheの設定
   sudo make setup-apache

   # Apache設定の有効化
   sudo make enable-apache

   # デプロイ
   sudo make deploy
   ```

4. **アクセス**
   - デプロイ完了後、`http://サーバーのIPまたはドメイン名/auto-schedule` でアクセス可能です。

#### トラブルシューティング

- **Apache エラーログの確認**
  ```bash
  sudo tail -f /var/log/apache2/auto-schedule-error.log
  ```

- **PM2 プロセスの確認**
  ```bash
  pm2 list
  pm2 logs auto-schedule
  ```

- **Next.jsアプリの再起動**
  ```bash
  sudo systemctl restart pm2-auto-schedule
  ```

- **Apache の再起動**
  ```bash
  sudo systemctl restart apache2
  ```

## 技術スタック

- Next.js 15
- React 19
- NextAuth.js
- Gemini API
- TailwindCSS
- TypeScript
