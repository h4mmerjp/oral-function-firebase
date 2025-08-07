# 🚀 デプロイメントガイド

新しいお問い合わせシステムとリリースノート機能のデプロイ手順です。

## 📋 事前準備

### 1. GitHub Personal Access Token (PAT) の作成

1. GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. 以下の権限を付与:
   - **Repository permissions**:
     - Issues: Write
     - Actions: Write
     - Contents: Read
     - Metadata: Read

### 2. Vercel環境変数の設定

Vercelダッシュボードで以下の環境変数を設定:

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REPO=h4mmerjp/oral-function-firebase
NODE_ENV=production
```

## 🔧 デプロイ手順

### Step 1: ファイルのデプロイ

```bash
# 新しいファイルがすべて含まれていることを確認
git add .
git commit -m "プライベートお問い合わせシステム実装

- Vercel Functions API (contact.js, releases.js)
- GitHub Actions workflow (contact-handler.yml)
- フロントエンド改修 (contact.html, app.js)
- セキュリティ設定 (vercel.json)"

git push origin main
```

### Step 2: Vercel再デプロイ

1. Vercelダッシュボードでプロジェクトを開く
2. 「Redeploy」ボタンをクリック
3. 環境変数が正しく設定されていることを確認

### Step 3: GitHub Actions有効化

1. GitHub repository → Settings → Actions → General
2. 「Allow all actions and reusable workflows」を選択
3. Workflow permissions → 「Read and write permissions」を選択

### Step 4: GitHub Repository設定

1. **Issues設定**:
   - Settings → General → Features
   - Issues ✅ をチェック
   - 「Restrict pushes that create public issues」を有効化（推奨）

2. **Webhook設定** (必要に応じて):
   - Settings → Webhooks → Add webhook
   - Payload URL: `https://your-domain.vercel.app/api/webhook`
   - Content type: `application/json`
   - Events: Issues, Issue comments

## 🧪 動作確認

### 1. お問い合わせフォームテスト

1. `https://your-domain.vercel.app/contact.html` にアクセス
2. テストデータを入力して送信
3. 成功メッセージとSubmission IDが表示されることを確認

### 2. GitHub Issue自動作成確認

1. GitHub repository → Issues タブ
2. 新しいIssueが自動作成されていることを確認
3. ラベル（private-submission, category-*）が正しく付与されていることを確認

### 3. Claude自動応答確認

1. 作成されたIssueに自動でコメントが追加されることを確認
2. 応答内容が適切であることを確認

### 4. リリースノート表示確認

1. メインアプリの「更新情報」ボタンをクリック
2. 内部API経由でリリース情報が表示されることを確認
3. GitHubへの直接リンクが削除されていることを確認

## 🔍 トラブルシューティング

### お問い合わせ送信エラー

**症状**: 送信ボタンを押してもエラーになる

**確認項目**:
1. Vercel環境変数 (`GITHUB_TOKEN`, `GITHUB_REPO`) が設定されているか
2. GitHub Personal Access Tokenの権限が適切か
3. ブラウザのコンソールログでエラー詳細を確認

**解決方法**:
```bash
# Vercel CLIでローカルテスト
vercel dev
# http://localhost:3000/contact.html でテスト
```

### GitHub Actions失敗

**症状**: Issue作成時にWorkflowが失敗する

**確認項目**:
1. `.github/workflows/contact-handler.yml` が正しくpushされているか
2. GitHub Actions の permissions 設定が適切か
3. Workflow実行ログでエラー詳細を確認

**解決方法**:
1. Actions タブ → 失敗したWorkflow → ログ確認
2. 権限不足の場合はRepository Settings → Actions → General → Workflow permissions を確認

### リリースノート表示エラー

**症状**: 更新情報が表示されない

**確認項目**:
1. `/api/releases` エンドポイントが正常に動作しているか
2. ブラウザのNetworkタブでAPIレスポンスを確認
3. Vercelのファンクションログを確認

**解決方法**:
```bash
# APIエンドポイント直接テスト
curl https://your-domain.vercel.app/api/releases
```

## 📊 監視・運用

### 1. ログ監視

- Vercel Functions → View Function Logs
- GitHub Actions → Workflow runs
- ブラウザコンソールエラー

### 2. パフォーマンス監視

- お問い合わせ送信成功率
- API応答時間
- GitHub Actions実行時間

### 3. セキュリティ監視

- 異常な送信頻度の検出
- スパム投稿の検出
- エラー率の監視

## 🔄 アップデート手順

### APIの更新

1. `api/contact.js` または `api/releases.js` を修正
2. Gitにコミット・プッシュ
3. Vercelが自動デプロイ

### GitHub Actions の更新

1. `.github/workflows/contact-handler.yml` を修正
2. Gitにコミット・プッシュ
3. 次回Issue作成時に新しいWorkflowが実行

### フロントエンドの更新

1. `contact.html` または `app.js` を修正
2. Gitにコミット・プッシュ
3. Vercelが自動デプロイ

## 🚨 緊急時の対応

### システム停止が必要な場合

1. Vercel環境変数 `GITHUB_TOKEN` を一時的に削除
2. お問い合わせフォームがフォールバックモードになる
3. 手動での対応案内が表示される

### ロールバック

1. Vercel Dashboard → Deployments
2. 前のデプロイメントを選択
3. 「Promote to Production」をクリック

---

## 📞 サポート連絡先

- 技術的な問題: GitHub Issues
- 緊急時対応: システム管理者
- デプロイメント支援: DevOpsチーム