# Vercel デプロイ設定ガイド

Stripe決済機能付きの口腔機能低下症診断・管理アプリをVercelにデプロイするための設定手順。

## 📦 必要なファイル構成

```
プロジェクトルート/
├── api/
│   ├── create-checkout-session.js   # Stripe Checkout Session作成
│   ├── cancel-subscription.js       # サブスクリプションキャンセル
│   └── stripe-webhook.js           # Stripe Webhook処理
├── package.json                    # Node.js依存関係
├── vercel.json                     # Vercel設定
└── その他のHTML/JSファイル
```

## 🔧 環境変数の設定

Vercelダッシュボード → プロジェクト設定 → Environment Variables で以下を設定：

### Stripe関連
```bash
STRIPE_SECRET_KEY=sk_test_... または sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...（Webhookエンドポイント作成後に取得）
```

### Firebase関連
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

⚠️ **注意**:
- `FIREBASE_PRIVATE_KEY`は改行文字（\n）を含む形式で設定
- 各環境変数はProduction, Preview, Developmentすべてに設定

## 🛠️ Firebase Service Account設定

1. **Firebase Console**にアクセス
2. **プロジェクト設定 → サービスアカウント**
3. **新しい秘密鍵を生成**をクリック
4. ダウンロードしたJSONファイルから以下を取得：
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

## 💳 Stripe設定

### 1. Stripe Dashboard設定
1. **Products → Create Product**でプレミアムプラン作成
2. **Price ID**をメモ（`firebase-config.js`の`priceId`に設定）
3. **API Keys**から`Secret Key`を取得

### 2. Webhook設定
1. **Developers → Webhooks → Add endpoint**
2. **Endpoint URL**: `https://your-domain.vercel.app/api/stripe-webhook`
3. **Listen to events**: 以下のイベントを選択
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. **Signing secret**をコピーして`STRIPE_WEBHOOK_SECRET`に設定

## 🚀 デプロイ手順

### 1. 初回デプロイ
```bash
# 依存関係をインストール
npm install

# Vercel CLIでログイン
npx vercel login

# デプロイ
npx vercel --prod
```

### 2. 環境変数設定
Vercelダッシュボードで環境変数を設定後、再デプロイ：
```bash
npx vercel --prod
```

### 3. 設定確認
1. `/api/create-checkout-session`エンドポイントのテスト
2. Stripe Webhookのテスト
3. 決済フローの動作確認

## 🧪 テスト方法

### 1. ローカルテスト
```bash
# Vercel開発サーバー起動
npx vercel dev

# ブラウザで http://localhost:3000 にアクセス
```

### 2. Stripe テストカード
```
カード番号: 4242 4242 4242 4242
有効期限: 任意の未来の日付
CVC: 任意の3桁
```

### 3. Webhook テスト
Stripe CLIを使用：
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

## 🔧 トラブルシューティング

### よくあるエラー

#### 1. Firebase Admin初期化エラー
```
Error: Failed to parse private key
```
**解決策**: `FIREBASE_PRIVATE_KEY`の改行文字が正しく設定されているか確認

#### 2. Stripe Webhook署名エラー
```
Webhook Error: No signatures found matching the expected signature
```
**解決策**: `STRIPE_WEBHOOK_SECRET`が正しく設定されているか確認

#### 3. CORS エラー
```
Access to fetch at 'api/...' has been blocked by CORS policy
```
**解決策**: `vercel.json`のCORS設定を確認

### ログ確認
```bash
# Vercel関数のログ確認
npx vercel logs

# Stripe Webhookのログ確認
stripe logs tail
```

## 📋 デプロイ後チェックリスト

- [ ] 環境変数がすべて設定されている
- [ ] Stripe Webhookエンドポイントが正しく設定されている
- [ ] Firebase Service Accountの権限が適切に設定されている
- [ ] CSP（Content Security Policy）にStripeのドメインが含まれている
- [ ] テストカードで決済フローが動作する
- [ ] サブスクリプションのキャンセルが動作する
- [ ] プラン表示が正しく更新される

## 🛡️ セキュリティ考慮事項

1. **環境変数の管理**: 本番環境とテスト環境で異なるキーを使用
2. **Webhook署名検証**: すべてのWebhookで署名を検証
3. **HTTPS必須**: 本番環境ではHTTPS接続のみ許可
4. **CSP設定**: 適切なContent Security Policyを設定
5. **秘密鍵の管理**: Firebase秘密鍵は安全に管理

## 📞 サポート

問題が発生した場合：
1. Vercelの関数ログを確認
2. Stripeのダッシュボードでイベントログを確認
3. Firebase Consoleでエラーログを確認
4. 設定ファイルの構文エラーがないか確認