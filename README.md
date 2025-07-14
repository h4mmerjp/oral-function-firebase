# 口腔機能低下症 診断・管理アプリ

日本老年歯科医学会の基準に基づく口腔機能低下症の診断と管理を支援するWebアプリケーションです。

## 概要

このアプリケーションは、高齢者の口腔機能低下症の診断と管理を効率的に行うためのツールです。Firebase を使用したクラウドベースの患者管理システムで、検査結果の記録、診断、管理計画の作成、進捗追跡などの機能を提供します。

## 主な機能

### 📋 患者管理
- 患者の基本情報登録・編集
- 患者一覧の表示・検索・フィルタリング
- 患者履歴の確認

### 🔍 口腔機能精密検査
- 7つの検査項目に対応
  - 口腔衛生状態不良
  - 口腔乾燥
  - 咬合力低下
  - 舌口唇運動機能低下
  - 低舌圧
  - 咀嚼機能低下
  - 嚥下機能低下

### 📊 診断機能
- 検査結果に基づく自動診断
- 診断結果の詳細表示
- 統計情報の提供

### 📝 管理計画
- 管理計画書の作成
- 管理指導記録簿の作成・更新
- 印刷機能対応

### 💾 データ管理
- Firebase によるクラウドデータベース
- データのエクスポート・インポート機能
- オフライン時のローカルストレージ対応

## 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **バックエンド**: Firebase
  - Firebase Authentication (Google認証)
  - Cloud Firestore (データベース)
- **ストレージ**: ローカルストレージ (オフライン対応)

## セットアップ

### 必要な環境
- モダンなWebブラウザ (Chrome, Firefox, Safari, Edge)
- インターネット接続 (Firebase機能を利用する場合)

### インストール手順

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/your-username/oral-function-firebase.git
   cd oral-function-firebase
   ```

2. **Firebase設定**
   - Firebase Console でプロジェクトを作成
   - Authentication で Google認証を有効化
   - Firestore Database を作成
   - `firebase-config.js` の設定を更新

3. **ローカルサーバーの起動**
   ```bash
   # 簡易HTTPサーバーを起動 (Python 3)
   python -m http.server 8000
   
   # または Node.js を使用
   npx http-server
   ```

4. **ブラウザでアクセス**
   ```
   http://localhost:8000
   ```

## Firebase設定

`firebase-config.js` ファイルで以下の設定を行います：

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

### Firestore セキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /patients/{patientId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        match /assessments/{assessmentId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```

## 使用方法

### 1. ログイン
- 「Googleでログイン」ボタンをクリック
- Googleアカウントで認証
- 無料プランでは5人まで患者登録可能

### 2. 患者登録
- 「新規患者登録」をクリック
- 必要事項を入力して保存

### 3. 検査の実施
- 患者を選択
- 「口腔機能精密検査」タブに移動
- 7つの検査項目を実施
- 結果を入力して保存

### 4. 診断確認
- 「診断結果」タブで自動診断結果を確認
- 3項目以上該当で口腔機能低下症と診断

### 5. 管理計画作成
- 「管理計画書」タブで計画書を作成
- 「管理指導記録簿」で進捗を記録

## ファイル構成

```
oral-function-firebase/
├── index.html              # メインHTML
├── styles.css              # スタイルシート
├── app.js                  # メインアプリケーション
├── firebase-config.js      # Firebase設定
├── database.js             # データベース操作
├── patients.js             # 患者管理
├── assessment.js           # 検査機能
├── management.js           # 管理計画
└── README.md              # このファイル
```

## 開発者向け情報

### デバッグ機能
- `Ctrl + Shift + D`: デモデータ作成
- `Ctrl + Shift + F`: Firebase デバッグ情報表示

### ローカルストレージ構造
```javascript
{
  "patients": [...],
  "assessments": [...],
  "management_plans": [...],
  "progress_records": [...]
}
```

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 参考資料

- [日本老年歯科医学会](https://www.gerodontology.jp/)
- [口腔機能低下症に関する基本的な考え方](https://www.jads.jp/basic/pdf/kuchikukinouteika.pdf)
- [Firebase Documentation](https://firebase.google.com/docs)

## 貢献

プロジェクトへの貢献を歓迎します。Issue や Pull Request をお気軽にお送りください。

## サポート

問題が発生した場合は、以下の方法でサポートを受けられます：
- GitHub Issues でバグ報告
- 機能リクエストの提出
- ドキュメントの改善提案