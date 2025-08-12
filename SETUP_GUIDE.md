# 口腔機能低下症診断アプリ - Stripe × AdSense 統合セットアップガイド

このドキュメントは、Stripe サブスクリプション機能と Google AdSense を統合した口腔機能低下症診断アプリのセットアップ手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [Firebase セットアップ](#firebase-セットアップ)
3. [Stripe セットアップ](#stripe-セットアップ)
4. [Google AdSense セットアップ](#google-adsense-セットアップ)
5. [Vercel デプロイメント設定](#vercel-デプロイメント設定)
6. [環境変数設定](#環境変数設定)
7. [テスト手順](#テスト手順)
8. [本番環境への移行](#本番環境への移行)
9. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なアカウント
- [Firebase プロジェクト](https://firebase.google.com/)
- [Stripe アカウント](https://stripe.com/)
- [Google AdSense アカウント](https://www.google.com/adsense/)
- [Vercel アカウント](https://vercel.com/)

### 技術要件
- Node.js 18.0.0 以上
- Git

---

## Firebase セットアップ

### 1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名: `oral-health-diagnosis` (任意)
4. Google Analytics を有効にする（推奨）

### 2. Authentication 設定

```bash
# Firebase Console での設定
1. Authentication > Sign-in method
2. Google プロバイダーを有効化
3. 承認済みドメインに本番ドメインを追加
```

### 3. Firestore Database 設定

```bash
# Firebase Console での設定
1. Firestore Database > データベースの作成
2. テストモードで開始
3. ロケーション: asia-northeast1 (東京)
```

### 4. セキュリティルール設定

```javascript
// Firestore セキュリティルール
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーデータへのアクセス制御
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // サブスクリプションデータは読み取り専用
      match /subscription {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if false; // サーバーサイドからのみ更新
      }
      
      // 患者データへのアクセス制御
      match /patients/{patientId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 5. Admin SDK サービスアカウント作成

```bash
# Firebase Console での設定
1. プロジェクト設定 > サービスアカウント
2. 「新しい秘密鍵の生成」をクリック
3. JSON ファイルをダウンロード
4. 必要な情報を環境変数として設定（後述）
```

---

## Stripe セットアップ

### 1. Stripe アカウント作成・設定

1. [Stripe Dashboard](https://dashboard.stripe.com/) にアクセス
2. アカウント作成・認証完了
3. 「開発者」タブで API キーを確認

### 2. プロダクト・料金設定

```bash
# Stripe Dashboard での設定
1. 商品 > 商品を追加

# スタンダードプラン
- 名前: 口腔機能診断アプリ - スタンダードプラン
- 説明: 50人まで患者登録可能、広告非表示
- 料金: ¥1,980/月 (recurring)
- Price ID をメモ: price_xxxxx

# プロプラン
- 名前: 口腔機能診断アプリ - プロプラン  
- 説明: 無制限患者登録、広告非表示、優先サポート
- 料金: ¥4,980/月 (recurring)
- Price ID をメモ: price_xxxxx
```

### 3. Webhook エンドポイント設定

```bash
# Stripe Dashboard での設定
1. 開発者 > Webhook
2. エンドポイントを追加

# 開発環境用
- URL: https://your-domain.vercel.app/api/webhook
- イベント選択:
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed

# 本番環境用も同様に作成
```

### 4. Stripe CLI セットアップ（開発時）

```bash
# Stripe CLI インストール
curl -s https://packages.stripe.com/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.com/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe

# ログイン
stripe login

# Webhook テスト
stripe listen --forward-to localhost:3000/api/webhook
```

---

## Google AdSense セットアップ

### 1. AdSense アカウント作成・審査

```bash
# 事前準備
1. サイトに十分なコンテンツを用意
2. プライバシーポリシー、利用規約ページ作成済み
3. お問い合わせページ作成済み

# AdSense 申請
1. https://www.google.com/adsense/ にアクセス
2. サイトを追加
3. 審査通過まで待機（1-14日程度）
```

### 2. 医療系コンテンツ対応

```bash
# 重要な注意事項
1. 診断結果ページでは広告非表示
2. 患者データ表示ページでは広告非表示
3. 薬機法に準拠した内容のみ
4. Google Healthcare & Medicine 認証検討
```

### 3. 広告ユニット作成

```bash
# AdSense での設定
1. 広告 > 広告ユニット別 > ディスプレイ広告

# サイドバー広告
- 名前: Sidebar Ad
- サイズ: レスポンシブ
- 広告コードをメモ

# フッター広告
- 名前: Footer Ad  
- サイズ: レスポンシブ
- 広告コードをメモ

# コンテンツ内広告
- 名前: Content Ad
- サイズ: レスポンシブ
- 広告コードをメモ
```

---

## Vercel デプロイメント設定

### 1. Vercel プロジェクト作成

```bash
# GitHub リポジトリ連携
1. Vercel Dashboard にログイン
2. Import Project
3. GitHub リポジトリを選択
4. プロジェクト名設定
```

### 2. ビルド設定

```bash
# vercel.json の設定確認
{
  "functions": {
    "api/checkout.js": { "maxDuration": 30 },
    "api/webhook.js": { "maxDuration": 30 },
    "api/subscription.js": { "maxDuration": 30 }
  }
}
```

### 3. カスタムドメイン設定

```bash
# Vercel Dashboard での設定
1. プロジェクト > Settings > Domains
2. カスタムドメイン追加
3. DNS 設定（A レコード、CNAME レコード）
4. SSL 証明書自動発行確認
```

---

## 環境変数設定

### Vercel Environment Variables

```bash
# Firebase 設定
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your-private-key...\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=your-private-key-id  
FIREBASE_CLIENT_ID=your-client-id

# Stripe 設定
STRIPE_SECRET_KEY=sk_test_xxxxx (本番: sk_live_xxxxx)
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx (本番: pk_live_xxxxx)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_STANDARD_PRICE_ID=price_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx

# その他
DOMAIN=https://your-domain.com
NODE_ENV=production
```

### フロントエンド環境変数（公開）

```javascript
// index.html 内で設定
<script>
  window.FIREBASE_API_KEY = 'your-api-key';
  window.STRIPE_PUBLISHABLE_KEY = 'pk_test_xxxxx';
  window.STRIPE_STANDARD_PRICE_ID = 'price_xxxxx';
  window.STRIPE_PRO_PRICE_ID = 'price_xxxxx';
</script>
```

---

## テスト手順

### 1. ローカル開発環境

```bash
# パッケージインストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集

# ローカルサーバー起動
vercel dev

# Stripe Webhook テスト
stripe listen --forward-to localhost:3000/api/webhook
```

### 2. 機能テスト

```bash
# Firebase Authentication
1. Google ログインテスト
2. ユーザー情報 Firestore 保存確認
3. ログアウトテスト

# Stripe Integration  
1. プラン選択画面表示
2. Checkout セッション作成
3. テスト決済実行
4. Webhook 受信確認
5. サブスクリプション状況反映確認

# AdSense Integration
1. 無料ユーザーでの広告表示
2. 有料ユーザーでの広告非表示
3. 制限ページでの広告非表示
4. レスポンシブ表示確認
```

### 3. E2E テストシナリオ

```bash
# シナリオ1: 新規ユーザー登録 → 有料プラン契約
1. サイトアクセス
2. Google ログイン
3. 無料プランで患者5人登録
4. 6人目登録時にアップグレード促進
5. スタンダードプラン契約
6. 患者追加登録可能確認
7. 広告非表示確認

# シナリオ2: サブスクリプション管理
1. 有料プラン契約済みユーザーでログイン
2. サブスクリプション情報確認
3. キャンセル実行
4. 再開実行
```

---

## 本番環境への移行

### 1. Stripe 本番モード切り替え

```bash
# Stripe Dashboard
1. 「本番データを表示」に切り替え
2. API キーを本番用に変更
3. Webhook エンドポイントを本番用に設定
4. 環境変数を本番用に更新
```

### 2. Firebase 本番設定

```bash
# Firebase Console
1. Authentication 承認済みドメインに本番ドメイン追加
2. Firestore セキュリティルール本番用に変更
3. 課金設定（Blaze プラン）有効化
```

### 3. AdSense 本番化

```bash
# AdSense 
1. サイト審査通過確認
2. 広告配信開始
3. 広告ポリシー遵守確認
4. 収益化レポート監視開始
```

### 4. 監視・アラート設定

```bash
# Vercel Analytics
1. Web Analytics 有効化
2. Core Web Vitals 監視

# Stripe Monitoring  
1. Webhook エラー監視設定
2. 決済失敗アラート設定
3. 売上レポート設定

# Firebase Monitoring
1. Crashlytics 設定（オプション）
2. Performance Monitoring 有効化
```

---

## トラブルシューティング

### よくある問題と解決方法

#### Firebase 認証エラー
```bash
# 症状: ログインできない
原因: 
- 承認済みドメインが未設定
- サービスアカウント権限不足

解決方法:
1. Firebase Console > Authentication > Settings > 承認済みドメイン
2. 本番ドメインを追加
3. サービスアカウント権限確認
```

#### Stripe Webhook エラー
```bash
# 症状: Webhook が受信されない
原因:
- エンドポイント URL 間違い
- 署名検証失敗
- タイムアウト

解決方法:
1. Stripe Dashboard > Webhook > ログ確認
2. 署名シークレット確認
3. API 処理時間最適化
```

#### AdSense 広告非表示
```bash  
# 症状: 広告が表示されない
原因:
- AdSense 審査未通過
- 広告ブロッカー
- CSP ヘッダー制限

解決方法:
1. AdSense アカウント状況確認
2. CSP ヘッダー設定見直し
3. ブラウザ開発者ツールでエラー確認
```

#### パフォーマンス問題
```bash
# 症状: ページ読み込みが遅い
原因:
- AdSense スクリプト読み込み遅延
- Firebase 初期化遅延
- 外部 API コール多数

解決方法:
1. スクリプト非同期読み込み
2. リソースプリロード設定
3. Core Web Vitals 監視
```

### デバッグ方法

```javascript
// 開発者ツール コンソールでのデバッグ
// Firebase 状況確認
window.fbDebug();

// Stripe 状況確認
console.log(window.stripeManager.getDebugInfo());

// AdSense 状況確認  
window.adDebug();

// 全体状況確認
console.log(window.appInitStatus);
```

### ログ監視

```bash
# Vercel Functions ログ
vercel logs

# Stripe Dashboard ログ
Dashboard > Webhook > ログタブ

# Firebase Console ログ  
Console > Functions > ログタブ
```

---

## セキュリティチェックリスト

### 必須セキュリティ対策

- [ ] Stripe Webhook 署名検証実装済み
- [ ] Firebase セキュリティルール適用済み
- [ ] CSP ヘッダー設定済み
- [ ] HTTPS 強制リダイレクト設定済み
- [ ] 環境変数の適切な管理
- [ ] API エンドポイントの認証・認可
- [ ] ユーザー入力値のサニタイズ
- [ ] ログでの機密情報出力回避

### 定期監査項目

- [ ] 依存パッケージ脆弱性チェック
- [ ] API キーローテーション
- [ ] アクセスログ監視
- [ ] 不正アクセス検知設定
- [ ] データバックアップ確認
- [ ] 災害復旧計画更新

---

## サポート・連絡先

### 技術サポート
- Firebase サポート: https://firebase.google.com/support
- Stripe サポート: https://support.stripe.com
- Vercel サポート: https://vercel.com/support

### ドキュメント
- Firebase Docs: https://firebase.google.com/docs
- Stripe Docs: https://stripe.com/docs
- AdSense Help: https://support.google.com/adsense

---

**注意**: このガイドは初期セットアップ用です。実際の運用では、セキュリティ、パフォーマンス、法的コンプライアンスの観点から、定期的な見直しと更新が必要です。