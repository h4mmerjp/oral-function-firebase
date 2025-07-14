# 口腔機能低下症 診断・管理アプリ v2.0

日本老年歯科医学会の基準に基づく口腔機能低下症の診断・管理を支援するWebアプリケーションです。

## ✨ 新機能（v2.0）

- **Firebase クラウド連携**: データをクラウドに安全に保存
- **リアルタイム同期**: 複数デバイス間でのデータ同期
- **患者数制限管理**: 無料プラン（5人まで）とプレミアムプラン対応
- **Googleアカウント認証**: 簡単・安全なログイン
- **聖隷式嚥下質問紙対応**: 嚥下機能評価の選択肢拡大
- **レスポンシブデザイン**: スマートフォン・タブレット対応

## 📋 概要

口腔機能低下症は、加齢や疾患などにより口腔機能が複合的に低下している疾患です。本アプリケーションは、7つの評価項目による診断から管理計画の作成、経過記録まで一貫して管理できるクラウド対応ツールです。

## 🌟 主要機能

### 👥 患者管理
- **患者登録・編集・削除**（重複チェック付き）
- **高度検索・フィルタリング**（名前、患者ID、診断状態）
- **全身状態の記録**（基礎疾患、身長・体重、BMI自動計算）
- **患者一覧での診断ステータス表示**
- **データ使用量管理**

### 🔬 口腔機能精密検査

**7つの評価項目**による包括的診断：

1. **口腔衛生状態不良の評価（TCI）**
   - 舌表面9分割での舌苔評価
   - TCI値自動計算（基準値：50%以上）

2. **口腔乾燥の評価**
   - 口腔粘膜湿潤度測定（基準値：27.0未満）
   - サクソンテスト（基準値：2g/2分以下）

3. **咬合力低下の評価**
   - 咬合力測定（基準値：350N未満）
   - 残存歯数評価（基準値：20本未満）

4. **舌口唇運動機能低下の評価**
   - オーラルディアドコキネシス（パタカラ）
   - 基準値：各6回/秒未満

5. **低舌圧の評価**
   - 舌圧測定（基準値：30kPa未満）

6. **咀嚼機能低下の評価**
   - グルコース溶出量測定（基準値：100mg/dL未満）
   - 咀嚼能率スコア法（基準値：スコア2以下）

7. **嚥下機能低下の評価**
   - EAT-10スクリーニング検査（基準値：3点以上）
   - **聖隷式嚥下質問紙**（基準値：A評価1項目以上）

### 📊 診断・評価
- **自動診断判定**（3項目以上該当で口腔機能低下症）
- **詳細な評価結果表示**（各項目の検査値と判定）
- **印刷対応**の診断書
- **進捗バー**による検査完了状況の可視化

### 📝 管理計画書
- **各機能項目の管理方針設定**（問題なし・機能維持・機能向上）
- **目標設定と治療計画の記録**
- **再評価時期の設定**
- **デフォルト計画の自動生成**
- **印刷対応**の計画書

### 📈 管理指導記録簿
- **経過評価の記録**（改善・著変なし・悪化）
- **所見記録**（全身状態・口腔機能・その他）
- **管理内容の記録**
- **履歴管理**と時系列表示

### 📚 履歴・統計
- **患者別検査履歴**
- **管理指導記録履歴**
- **統計情報表示**
- **データエクスポート・インポート**

### ☁️ クラウド機能
- **自動バックアップ**（Firestore）
- **デバイス間同期**
- **オフライン対応**
- **使用量監視**

## 🛠 システム要件

### 必須要件
- **Webブラウザ**: Chrome、Firefox、Safari、Edge（最新版推奨）
- **JavaScript**: 有効にする必要があります
- **インターネット接続**: データ保存・同期に必要

### 推奨環境
- **デスクトップ**: Windows 10/11、macOS 10.15以降
- **モバイル**: iOS 13以降、Android 8以降
- **画面解像度**: 1024×768以上

## 🚀 インストールと使用方法

### 1. ファイル構成

```
oral-health-app/
├── index.html              # メインHTMLファイル
├── styles.css              # スタイルシート
├── app.js                  # メインアプリケーション
├── database.js             # データベース管理（Firebase版）
├── firebase-config.js      # Firebase設定
├── patients.js             # 患者管理
├── assessment.js           # 検査管理
├── management.js           # 管理計画・記録
├── .env.example            # 環境変数テンプレート
└── README.md              # このファイル
```

### 2. Vercelでのデプロイ設定

#### 🔐 環境変数の設定（セキュリティ最重要）

Vercelダッシュボードの「Environment Variables」で以下を設定：

```bash
# Firebase設定（すべて必須）
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

#### 🛡️ セキュリティ設定

**Firebase Console での設定：**

1. **Authentication > Settings > Authorized domains**
   ```
   your-domain.vercel.app
   your-custom-domain.com
   ```

2. **Firestore Security Rules**（本番環境用）
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // ユーザーは自分のデータのみアクセス可能
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
         
         // 患者データ
         match /patients/{patientId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
           
           // 検査データ
           match /assessments/{assessmentId} {
             allow read, write: if request.auth != null && request.auth.uid == userId;
           }
           
           // 管理計画データ
           match /management/{managementId} {
             allow read, write: if request.auth != null && request.auth.uid == userId;
           }
         }
       }
       
       // 管理者専用データ（オプション）
       match /admin/{document=**} {
         allow read, write: if request.auth != null && 
           request.auth.token.admin == true;
       }
     }
   }
   ```

3. **Firebase Hosting（必要に応じて）**
   ```json
   {
     "hosting": {
       "public": "dist",
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ],
       "headers": [
         {
           "source": "**",
           "headers": [
             {
               "key": "X-Content-Type-Options",
               "value": "nosniff"
             },
             {
               "key": "X-Frame-Options",
               "value": "DENY"
             },
             {
               "key": "X-XSS-Protection",
               "value": "1; mode=block"
             }
           ]
         }
       ]
     }
   }
   ```

#### 🚀 デプロイ手順

1. **Vercelプロジェクト作成**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **環境変数設定**
   - Vercelダッシュボード > Settings > Environment Variables
   - 上記の Firebase 環境変数を設定

3. **ドメイン設定**
   - Vercelダッシュボード > Settings > Domains
   - カスタムドメイン追加（オプション）

4. **自動デプロイ設定**
   - GitHubリポジトリと連携
   - 自動デプロイ有効化

### 3. 起動方法

#### 📱 オンライン使用（推奨）
1. Webブラウザで `index.html` を開く
2. **「Googleでログイン」**をクリック
3. Googleアカウントでログイン
4. 患者データの登録・管理を開始

#### 💻 ローカル開発環境
```bash
# Python 3の場合
python -m http.server 8000

# Node.jsの場合
npx serve .

# PHPの場合
php -S localhost:8000
```

ブラウザで `http://localhost:8000` にアクセス

### 4. 初期設定

- **初回起動時**: データベースが自動初期化されます
- **認証設定**: Googleアカウントでログインが必要
- **デモデータ**: `Ctrl+Shift+D` で作成可能（開発時のみ）

### 5. セキュリティベストプラクティス

#### 🔒 環境変数管理
```bash
# 絶対に公開しないこと
NEXT_PUBLIC_FIREBASE_API_KEY=    # API キー
NEXT_PUBLIC_FIREBASE_PROJECT_ID= # プロジェクトID

# 環境別設定
# 開発環境: .env.local
# 本番環境: Vercelダッシュボード
```

#### 🛡️ セキュリティ設定チェックリスト
- [ ] Firebase API キーの適切な制限設定
- [ ] Firestore セキュリティルールの厳密な設定
- [ ] 認証ドメインの制限
- [ ] CORS設定の適切な制限
- [ ] 定期的なセキュリティ監査

#### 🚨 セキュリティ監視
- Firebase Console > Authentication > Usage で異常なアクセスを監視
- Cloud Firestore > Usage で異常なデータアクセスを監視
- Vercel Analytics で異常なトラフィックを監視

#### 🔐 データ保護
- 患者データの暗号化（Firebase標準）
- ユーザーごとの完全データ分離
- 定期的なバックアップ（自動）
- GDPR準拠のデータ削除機能

## 📖 使用方法

### 基本的なワークフロー

#### 1️⃣ **ログイン**
- 画面右上の「Googleでログイン」をクリック
- Googleアカウントでログイン

#### 2️⃣ **患者登録**
- 「患者一覧」タブで「新規患者登録」をクリック
- 基本情報を入力して保存

#### 3️⃣ **患者選択**
- 患者一覧から対象患者をクリック
- 「患者情報」タブに自動移動

#### 4️⃣ **全身状態の記録**
- 基礎疾患、服用薬剤、身長・体重などを入力
- 「全身状態を保存」をクリック

#### 5️⃣ **検査実施**
- 「検査開始」ボタンをクリック
- 7つの評価項目を順次実施
- 各項目で基準値と比較して自動判定

#### 6️⃣ **診断確認**
- 「検査完了・診断へ」をクリック
- 診断結果と詳細を確認

#### 7️⃣ **管理計画作成**
- 「管理計画書作成」をクリック
- 各項目の管理方針を設定
- 目標と治療計画を記入

#### 8️⃣ **経過記録**
- 「管理指導記録簿」タブで経過を記録
- 定期的な評価と所見を入力

## 💾 データ管理

### バックアップ
- **自動バックアップ**: Firestore クラウドに自動保存
- **手動エクスポート**: ヘッダーの「データエクスポート」でJSONファイル作成
- **インポート**: 「データインポート」で以前のデータを復元

### データ保存場所
- **クラウド**: Firebase Firestore（ログイン時）
- **ローカル**: ブラウザのローカルストレージ（緊急時バックアップ）

### セキュリティ
- **認証**: Google OAuth 2.0
- **データ分離**: ユーザーごとに完全分離
- **プライバシー**: 患者情報はユーザーアカウントに紐づけて暗号化

## 📊 料金プラン

### 🆓 無料プラン
- 患者数: **5人まで**
- 基本機能: すべて利用可能
- データ保存: クラウド対応
- サポート: コミュニティ

### 💎 プレミアムプラン（予定）
- 患者数: **無制限**
- 高度な統計機能
- 優先サポート
- データエクスポート拡張
- 料金: 月額2,980円

## 🛠 トラブルシューティング

### よくある問題

#### 🔐 ログインできない
- **対処法**: ブラウザのCookieを有効にしてください
- **確認点**: ポップアップブロッカーの設定確認
- **代替案**: ブラウザを変更してお試しください

#### 💾 データが保存されない
- **確認点**: インターネット接続の確認
- **必要条件**: Googleアカウントでのログイン
- **対処法**: ページのリロード（Ctrl+F5）

#### 👥 患者選択時に別の患者情報が表示される
- **対処法**: ブラウザを完全リロード（Ctrl+F5）
- **修復**: コンソールで `window.patientManager.clearAllPatientData()` 実行

#### 🖨 印刷時にレイアウトが崩れる
- **設定**: ブラウザの印刷設定で「背景色とイメージを印刷」を有効
- **用紙**: A4サイズに設定
- **向き**: 縦向き推奨

#### 📱 スマートフォンで操作しにくい
- **確認**: 最新ブラウザの使用
- **設定**: ズーム機能の活用
- **推奨**: タブレット以上の画面サイズ

### デバッグ機能

開発者コンソール（F12）で以下のコマンドが使用できます：

```javascript
// Firebase接続状況の確認
window.fbDebug()

// データベース状況の確認
window.db.getDebugInfo()

// 患者データの確認
window.patientManager.currentPatient

// 統計情報の表示
window.db.getStatistics()

// デモデータの作成（開発時のみ）
// Ctrl+Shift+D または以下のコマンド
// app.createDemoData()
```

## 👩‍💻 開発者向け情報

### アーキテクチャ
- **フロントエンド**: Vanilla JavaScript（ES6+）
- **データベース**: Firebase Firestore + ローカルストレージ
- **認証**: Firebase Authentication（Google OAuth）
- **UI**: レスポンシブデザイン（CSS Grid/Flexbox）
- **印刷**: CSS Media Queries

### カスタマイズ

#### 評価基準値の変更
`assessment.js` の各評価メソッドで基準値を変更：

```javascript
// 例：舌圧の基準値を変更
if (pressure < 30) { // この値を変更
  // 低舌圧ありの処理
}
```

#### スタイルの変更
`styles.css` でデザインをカスタマイズ可能

#### Firebase設定の変更
`firebase-config.js` の設定値を修正：
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ...
};
```

### 機能の追加
各機能は独立したクラスで実装されているため、拡張が容易：

- `PatientManager`: 患者管理機能
- `AssessmentManager`: 検査機能
- `ManagementManager`: 管理計画・記録機能
- `FirebaseManager`: クラウド連携機能

## 🔒 セキュリティとプライバシー

### データ保護
- **暗号化**: すべてのデータはFirebaseで暗号化
- **アクセス制御**: ユーザーごとの完全データ分離
- **認証**: Google OAuth 2.0による安全なログイン

### プライバシーポリシー
- 患者情報は医療目的でのみ使用
- 第三者への提供は行いません
- データの削除はいつでも可能

### コンプライアンス
- 医療情報の取り扱いガイドラインに準拠
- 個人情報保護法対応
- GDPR対応（EU圏）

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## ⚠️ 重要な注意事項

### 医療機器について
- **医療機器ではありません**: 本アプリケーションは診断補助ツールであり、医療機器として認定されていません
- **最終判断**: 診断や治療方針の最終決定は、必ず医療従事者が行ってください

### データ管理について
- **セキュリティ**: 患者情報を含むため、適切なセキュリティ対策を実施してください
- **バックアップ**: 重要なデータは定期的にエクスポートしてバックアップを取ってください
- **アクセス管理**: 権限のない者がアクセスできないよう管理してください

### 法的責任
- 本ソフトウェアの使用による一切の損害について、開発者は責任を負いません
- 医療行為に関する責任は使用者が負うものとします

## 📞 サポート

### 技術サポート
- **バグレポート**: GitHub Issues
- **機能要望**: GitHub Discussions
- **技術相談**: 開発チームまでご連絡ください

### 医学的内容について
- 口腔機能低下症の診断基準については日本老年歯科医学会の公式資料をご参照ください
- 医学的な判断については専門医にご相談ください

---

**日本老年歯科医学会の基準に基づく口腔機能低下症診断・管理アプリ v2.0**  
*患者の口腔機能維持・向上を支援するクラウド対応デジタルツール*
