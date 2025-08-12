# Stripe × Firebase × Vercel サブスクリプション & AdSense 統合仕様書

**作成日**: 2025-08-12

---

## 目次

1. 概要
2. 目的と要件
3. 技術スタック
4. アーキテクチャ図
5. 環境設定（手順）
6. 実装詳細（API／Webhook／フロント）
7. AdSense 統合（ポリシー順守含む）
8. テスト計画
9. 運用・監視・コスト
10. 切り分け済みタスク一覧（チェックリスト）

---

## 1. 概要

本ドキュメントは、既存の Firebase（Auth + Firestore）ベースの医療系 Web アプリに対し、

- Stripe によるサブスクリプション課金機能（有料プランの導入）
- Google AdSense を用いた無料ユーザー向け広告表示（有料ユーザーは広告非表示）

を統合して安全かつ運用しやすい形で実装するための技術仕様書です。

---

## 2. 目的と要件

### 目的

- 有料プランを導入して SaaS として収益化する
- 無料ユーザーからの広告収益を確保する
- 医療コンテンツの法的・ポリシー上のリスクを最小化する

### 非機能要件

- 広告は患者データや診断結果のページでは**表示しない**こと
- Stripe Webhook の署名検証を必須実装
- Firestore と Stripe の同期は**確実**に保つ
- Core Web Vitals を意識したパフォーマンス実装（LCP < 2.5s, CLS < 0.1）

---

## 3. 技術スタック

- フロントエンド: Next.js（Vercel 配備）
- バックエンド (API): Vercel Serverless Functions / Firebase Cloud Functions（選択可能）
- 認証: Firebase Authentication
- DB: Cloud Firestore
- 決済: Stripe
- 広告: Google AdSense
- 監視: Firebase Monitoring / Sentry（任意）

---

## 4. アーキテクチャ図

```mermaid
flowchart LR
  A[ユーザー(ブラウザ)] -->|ログイン| B[Next.js Frontend]
  B -->|Checkout API| C[Vercel API]
  C -->|Stripe API| D[Stripe]
  D -->|Webhook| C
  C -->|Admin SDK| E[Firestore]
  B -->|AdSense | F[Google AdSense]
  E -->|subscription state| B
```

---

## 5. 環境設定（手順）

### 5.1 Firebase

1. Firebase プロジェクト作成
2. Authentication を有効化（Google, Email 等）
3. Firestore を有効化（ルールは後述）
4. Admin SDK 用のサービスアカウント JSON を取得

### 5.2 Stripe

1. Stripe アカウント作成（Test Mode で初期設定）
2. Product と Price（月額/年額）を作成
3. Publishable Key / Secret Key を取得
4. Webhook エンドポイントを登録（Test と Prod で別 secret）

### 5.3 Vercel / Next.js

1. Next.js プロジェクト作成（既存なら repo を連携）
2. 環境変数を Vercel の Project Settings に設定

必須環境変数（例）:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

> メモ: `FIREBASE_PRIVATE_KEY` は `\n` を適切に扱う（Vercel では改行をエスケープする）

---

## 6. 実装詳細

### 6.1 Firestore スキーマ（推奨）

```
users/{uid} {
  email: string,
  stripeCustomerId?: string,
  subscription: {
    plan: "free" | "standard" | "pro",
    stripeSubscriptionId?: string,
    status?: string, // active, past_due, canceled etc.
    currentPeriodEnd?: timestamp,
    patientLimit?: number
  }
}
```

### 6.2 セキュリティルール（サンプル）

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function hasActiveSubscription(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.subscription.status == 'active';
    }

    match /users/{userId}/subscription {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // subscription は server-side 更新のみ
    }

    match /users/{userId}/patients/{patientId} {
      allow read, write: if request.auth != null && request.auth.uid == userId && hasActiveSubscription(userId);
    }
  }
}
```

> 注意: `hasActiveSubscription()` はリードオンリーの判定。ダウングレード時の patientLimit 超過処理はサーバーで制御する。

### 6.3 Checkout 作成 API（例）

- エンドポイント: `POST /api/checkout`（認証済みユーザー）
- 処理:
  1. Firestore で `stripeCustomerId` を確認
  2. ない場合は Stripe API で Customer を作成し Firestore に保存
  3. Stripe Checkout Session を作成（customer 指定、price 指定）
  4. session.url を返す

### 6.4 Webhook 実装（必須: 署名検証）

- 受信イベント: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `invoice.payment_failed`, `customer.subscription.deleted`
- Webhook は `STRIPE_WEBHOOK_SECRET` を使用して `stripe.webhooks.constructEvent` で検証する
- Webhook 内で Firestore の `users/{uid}.subscription` を更新する。`subscription.metadata.uid` を Checkout 時に付与しておくと紐付けが容易

### 6.5 AdSense 表示制御（技術）

- 基本方針: 有料ユーザーは広告非表示

- 実装パターン:

  - **別ビュー方式 (推奨)**: 有料ユーザー向けに広告タグを全く含まない `premium` ページを提供
  - **動的削除方式**: クライアント起点で DOM にある `.adsense-container` を除去（ただし改ざんリスクあり）
  - **ハイブリッド方式**: 別ビューを基準にし、ログイン中のセッションでリアルタイム切替をサーバー検証で行う

- 例: Checkout 成功後は Firestore の subscription.status を `active` に更新 → フロントはサーバー判定（API）で広告除外

---

## 7. AdSense 統合（ポリシー順守）

### 7.1 ポリシー要点

- 不正クリック誘導は厳禁（UI 文言にも注意）
- 医療・健康系広告はカテゴリ制限や認証が必要（日本の薬機法・Google 規約に注意）
- 患者データや診断結果ページは広告非表示必須

### 7.2 実務対応項目

- AdSense アカウントで **Auto Ads は OFF** 推奨（手動配置で制御）
- 広告フィルタ: 競合製品・不適切カテゴリをブロック
- 必要なら Google の Healthcare & Medicine 認証手続きの検討（LegitScript 等）

---

## 8. テスト計画

### 8.1 Stripe テスト

- Test Clock を使ったサブスクリプション周期・更新・キャンセルのシナリオ
- Webhook の署名検証テスト（悪意あるリクエスト遮断）

### 8.2 AdSense テスト

- 広告の読み込み・除去・遅延読み込みの動作確認
- CSP 設定テスト（開発 → ステージング → 本番で段階的に厳格化）
- モバイルでの広告ユニット数・表示位置テスト

### 8.3 負荷・統合テスト

- 同時 Checkout 発生時の Stripe リクエスト負荷
- 大量ユーザーによる広告読み込みでの UI/パフォーマンス評価

---

## 9. 運用・監視・コスト

### 9.1 運用フロー

- Webhook エラー監視（Slack 通知）
- 定期バッチで Stripe と Firestore の整合性確認（例: 毎日夜間）
- 広告ポリシー違反検出ログを RUM と合わせて監視

### 9.2 コスト概算

- Firebase Blaze: 従量課金（目安: 月数百円〜数千円、\$25 表示は最低料金ではない旨注意）
- Stripe 手数料: 3.6%（カード種別等で変動）
- AdSense: 基本的に配信手数料は不要（ただし収益は Google に依存）
- コンプライアンス費用: 医療広告認証が必要な場合は別途見積

---

## 10. 切り分け済みタスク一覧（チェックリスト）

### Phase 0: 前準備

-

### Phase 1: Stripe 実装 (MVP)

-

### Phase 2: AdSense 統合

-

### Phase 3: テスト・運用

- ***

## 付録

### 付録 A: 主要コードスニペット

（Webhook, Checkout, Firestore 更新のサンプルは別ファイル参照）

### 付録 B: 参考リンク

- Stripe Docs: [https://docs.stripe.com/](https://docs.stripe.com/)
- Firebase Docs: [https://firebase.google.com/docs](https://firebase.google.com/docs)
- Google AdSense Policy: [https://support.google.com/adsense/](https://support.google.com/adsense/)

---

**備考**: ドキュメントを PDF や印刷向けに整形（図の高解像度化やスクリーンショット追加）する場合は指示ください。
