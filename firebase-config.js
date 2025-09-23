// Firebase設定とSDK初期化（Stripe連携対応版）
class FirebaseManager {
  constructor() {
    this.app = null;
    this.auth = null;
    this.firestore = null;
    this.currentUser = null;
    this.isInitialized = false;
    // Stripe設定
    this.stripe = null;
    this.stripeConfig = {
      publishableKey: 'pk_test_51Q9vNaRyGCrOZJI8KLEm7SZDuNLmJ8YrptcxBQHYFRgqTPH8GfCfn7vn8GSkR6lCG5U4gZxNO4kGUxKMDDo3qC1j00qITFNrp4', // サンドボックス用
      priceId: 'price_1Q9vO5RyGCrOZJI8p7kNvMqo', // プレミアムプランの価格ID（実際の値に要更新）
      successUrl: window.location.origin + '/dashboard.html?subscription=success',
      cancelUrl: window.location.origin + '/dashboard.html?subscription=cancelled'
    };
  }

  // Firebase初期化
  async initialize() {
    try {
      // Firebase SDK の存在確認
      if (typeof window.firebase === "undefined") {
        console.error("Firebase SDK が読み込まれていません");
        return false;
      }

      // Firebase設定（環境変数から取得）
      const firebaseConfig = {
        apiKey: window.FIREBASE_API_KEY || "AIzaSyC8_B2eo47C2plYkGPq_ek6VaD113tNEBk",
        authDomain: "oral-health-diagnosis-ap-b3592.firebaseapp.com",
        projectId: "oral-health-diagnosis-ap-b3592",
        storageBucket: "oral-health-diagnosis-ap-b3592.firebasestorage.app",
        messagingSenderId: "338073541462",
        appId: "1:338073541462:web:f48f281cf84710ce7794f7",
        measurementId: "G-XLQ1FVCHN5",
      };

      // 本番環境での追加セキュリティチェック
      if (location.hostname !== 'localhost' && location.protocol !== 'https:') {
        throw new Error('HTTPS接続が必要です');
      }

      // Firebase初期化
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(firebaseConfig);
      } else {
        this.app = firebase.app();
      }

      // サービス初期化
      this.auth = firebase.auth();
      this.firestore = firebase.firestore();

      // Firestore設定
      try {
        this.firestore.settings({
          cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
          merge: true,
        });
      } catch (error) {
        console.log("Firestore設定警告（無視して継続）:", error.message);
      }

      // 認証状態の監視（最小修正版）
      this.setupAuthListener();

      this.isInitialized = true;

      return true;
    } catch (error) {
      console.error("Firebase 初期化エラー:", error);
      return false;
    }
  }

  // データベース準備完了を待つ（安全版）
  async waitForDatabaseReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (window.db && window.patientManager) {
          // データベースと患者マネージャーの基本準備確認
          resolve(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  // 認証状態監視（セキュリティ強化版）
  setupAuthListener() {
    this.auth.onAuthStateChanged(async (user) => {
      // セキュリティ: ログでのメールアドレス出力を制限
      console.log(
        "認証状態変更:",
        user ? `ログイン済み` : "未ログイン"
      );
      this.currentUser = user;

      if (user) {
        // セキュリティチェック
        if (window.securityUtils) {
          await window.securityUtils.checkAuthTokenExpiry(user);
          window.securityUtils.logUserAction('user_login', { 
            email: user.email,
            uid: user.uid 
          });
        }

        // 基本コンポーネントの準備を待ってからユーザーログイン処理を実行
        console.log("基本コンポーネントの準備完了を待機中...");
        await this.waitForDatabaseReady();
        await this.onUserLogin(user);
      } else {
        if (window.securityUtils) {
          window.securityUtils.logUserAction('user_logout');
        }
        this.onUserLogout();
      }
    });

    // 定期的な認証トークンチェック（15分間隔）
    setInterval(async () => {
      if (this.currentUser && window.securityUtils) {
        await window.securityUtils.checkAuthTokenExpiry(this.currentUser);
      }
    }, 15 * 60 * 1000);
  }

  // ユーザーログイン時の処理（最小修正版）
  async onUserLogin(user) {
    try {
      console.log("ユーザーログイン処理開始:", user.email);

      // ランディングページにいる場合はダッシュボードにリダイレクト
      if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        console.log("ランディングページからダッシュボードにリダイレクト");
        window.location.href = 'dashboard.html';
        return;
      }

      // データベースの基本準備確認
      if (!window.db) {
        console.log("データベース準備待機中...");
        // 短時間待機してから再確認
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!window.db) {
          console.warn("データベースが準備されていません");
          this.updateAuthUI(true, user);
          return;
        }
      }

      // ユーザー情報をFirestoreに保存/更新
      await this.ensureUserDocument(user);

      // 患者数を自動更新（Firestore直接取得）
      await this.syncPatientCountFromFirestore();

      // UI更新
      this.updateAuthUI(true, user);

      // 患者一覧を再読み込み（安全な呼び出し）
      if (
        window.patientManager &&
        typeof window.patientManager.loadPatients === "function"
      ) {
        try {
          await window.patientManager.loadPatients();
        } catch (error) {
          console.error("患者一覧読み込みエラー（ログイン時）:", error);
          // エラーが発生してもログイン処理は継続
        }
      } else {
        console.warn("patientManager が利用できません");
      }

      console.log("ユーザーログイン処理完了");
    } catch (error) {
      console.error("ログイン処理エラー:", error);
      this.showErrorMessage(
        "ログイン処理でエラーが発生しました: " + error.message
      );
    }
  }

  // Firestoreから患者数を直接取得して同期（エラーハンドリング強化）
  async syncPatientCountFromFirestore() {
    try {
      if (!this.currentUser || !window.db) return;

      console.log("Firestoreから患者数を直接取得中...");

      // Firestoreから患者データを直接取得
      const patientsRef = this.firestore
        .collection("users")
        .doc(this.currentUser.uid)
        .collection("patients");

      const snapshot = await patientsRef.get();
      const patientCount = snapshot.size;

      console.log("Firestoreの患者数:", patientCount);

      // 使用量を更新
      await this.updatePatientCount(patientCount);

      console.log("患者数同期完了:", patientCount);
    } catch (error) {
      console.error("患者数同期エラー:", error);
      // エラーが発生しても処理を継続
    }
  }

  // ユーザーログアウト時の処理
  onUserLogout() {
    console.log("ユーザーログアウト処理");

    // UI更新
    this.updateAuthUI(false, null);

    // 患者一覧をクリア（安全な呼び出し）
    if (
      window.patientManager &&
      typeof window.patientManager.displayPatients === "function"
    ) {
      try {
        window.patientManager.displayPatients([]);
        window.patientManager.clearAllPatientData();
      } catch (error) {
        console.error("ログアウト時のデータクリアエラー:", error);
      }
    }

    console.log("オフラインモードに切り替え");
  }

  // ユーザードキュメントの作成/確認
  async ensureUserDocument(user) {
    try {
      const userRef = this.firestore.collection("users").doc(user.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // 新規ユーザーの場合、基本情報を作成
        const userData = {
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          subscription: {
            plan: "free", // "free" or "premium"
            status: "active", // "active", "cancelled", "past_due", "incomplete"
            startDate: firebase.firestore.FieldValue.serverTimestamp(),
            endDate: null,
            patientLimit: 5, // 無料: 5, プレミアム: 999
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
          },
          usage: {
            patientCount: 0,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
          },
        };

        await userRef.set(userData);
        console.log("新規ユーザー作成:", user.email);

        // 新規ユーザー通知
        this.showSuccessMessage(
          "新規アカウントが作成されました！無料プランで5人まで患者登録が可能です。"
        );
      } else {
        console.log("既存ユーザー:", user.email);

        // 既存ユーザー歓迎メッセージ
        const userData = userDoc.data();
        const plan = userData.subscription?.plan || "free";
        this.showSuccessMessage(
          `おかえりなさい！${
            plan === "free" ? "無料プラン" : "プレミアムプラン"
          }でログインしました。`
        );
      }
    } catch (error) {
      console.error("ユーザードキュメント作成エラー:", error);
      throw error;
    }
  }

  // Google認証でログイン
  async signInWithGoogle() {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase が初期化されていません");
      }

      console.log("Google認証開始");

      // プロバイダー設定
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");

      // カスタムパラメータ設定
      provider.setCustomParameters({
        prompt: "select_account",
      });

      let result;

      try {
        // まずポップアップ方式を試行
        console.log("ポップアップ方式でGoogle認証を試行");
        result = await this.auth.signInWithPopup(provider);
      } catch (popupError) {
        console.log(
          "ポップアップ方式が失敗、リダイレクト方式を試行:",
          popupError.code
        );

        if (
          popupError.code === "auth/popup-blocked" ||
          popupError.code === "auth/cancelled-popup-request"
        ) {
          // ポップアップがブロックされた場合はリダイレクト方式
          console.log("リダイレクト方式に切り替え");
          await this.auth.signInWithRedirect(provider);
          return; // リダイレクト後に認証状態が変更される
        } else {
          throw popupError; // その他のエラーは再スロー
        }
      }

      console.log("Google認証成功:", result.user.email);
      return result.user;
    } catch (error) {
      console.error("Google認証エラー:", error);

      // エラーメッセージの詳細化
      let errorMessage = "ログインに失敗しました";

      switch (error.code) {
        case "auth/popup-closed-by-user":
          errorMessage = "ログインがキャンセルされました";
          break;
        case "auth/popup-blocked":
          errorMessage =
            "ポップアップがブロックされました。ブラウザの設定を確認してください";
          break;
        case "auth/network-request-failed":
          errorMessage =
            "ネットワークエラーが発生しました。インターネット接続を確認してください";
          break;
        case "auth/cancelled-popup-request":
          errorMessage = "ログイン処理がキャンセルされました";
          break;
        case "auth/unauthorized-domain":
          errorMessage = "このドメインからのログインは許可されていません";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Google認証が有効になっていません";
          break;
        default:
          errorMessage = `ログインに失敗しました: ${error.message}`;
      }

      this.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // リダイレクト結果の処理
  async handleRedirectResult() {
    try {
      const result = await this.auth.getRedirectResult();
      if (result.user) {
        console.log("リダイレクト認証成功:", result.user.email);
        return result.user;
      }
    } catch (error) {
      console.error("リダイレクト認証エラー:", error);
      this.showErrorMessage("認証に失敗しました: " + error.message);
    }
    return null;
  }

  // ログアウト
  async signOut() {
    try {
      await this.auth.signOut();
      console.log("ログアウト完了");
      this.showSuccessMessage("ログアウトしました");
    } catch (error) {
      console.error("ログアウトエラー:", error);
      this.showErrorMessage("ログアウトに失敗しました");
      throw error;
    }
  }

  // 認証UI更新
  updateAuthUI(isLoggedIn, user) {
    let authContainer = document.getElementById("auth-container");

    if (!authContainer) {
      // 認証コンテナが存在しない場合は作成
      authContainer = document.createElement("div");
      authContainer.id = "auth-container";
      authContainer.style.cssText = `
        position: absolute;
        top: 10px;
        right: 20px;
        background: white;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        min-width: 200px;
      `;

      const header = document.querySelector("header");
      if (header) {
        header.style.position = "relative";
        header.appendChild(authContainer);
      }
    }

    if (isLoggedIn && user) {
      authContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          ${
            user.photoURL
              ? `<img src="${user.photoURL}" alt="プロフィール" style="width: 32px; height: 32px; border-radius: 50%;">`
              : ""
          }
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: bold; color: #2c3e50;">${
              user.displayName || user.email
            }</div>
            <div style="font-size: 12px; color: #27ae60;" id="plan-status">✓ 無料プラン (5人まで)</div>
          </div>
          <button onclick="firebaseManager.signOut()" class="btn-secondary" style="padding: 6px 12px; font-size: 12px;">ログアウト</button>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 14px; margin-bottom: 8px; color: #e74c3c;">オフライン</div>
          <button onclick="firebaseManager.signInWithGoogle()" class="btn-success" style="padding: 8px 16px; font-size: 12px; white-space: nowrap;">Googleでログイン</button>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">データを保存するにはログイン必須</div>
        </div>
      `;
    }
  }

  // 患者数制限チェック（サブスクリプション対応版）
  async checkPatientLimit() {
    try {
      if (!this.currentUser) {
        // ログインしていない場合はオフライン
        return {
          allowed: false,
          isOffline: true,
          message: "ログインが必要です",
        };
      }

      const userRef = this.firestore
        .collection("users")
        .doc(this.currentUser.uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const subscription = userData.subscription || {};
        const usage = userData.usage || {};

        const plan = subscription.plan || "free";
        const current = usage.patientCount || 0;

        // プレミアムプランの場合は実質無制限
        if (plan === "premium") {
          // サブスクリプションの有効期限をチェック
          const isValidSubscription = await this.validateSubscription(subscription);

          if (isValidSubscription) {
            return {
              allowed: true,
              current: current,
              limit: 999, // 実質無制限
              plan: "premium",
              isOffline: false,
            };
          } else {
            // 期限切れの場合は無料プランに降格
            await this.downgradeToFreePlan();
          }
        }

        // 無料プランの制限チェック
        const limit = subscription.patientLimit || 5;

        console.log("制限チェック結果:", {
          current,
          limit,
          allowed: current < limit,
          plan
        });

        return {
          allowed: current < limit,
          current: current,
          limit: limit,
          plan: "free",
          isOffline: false,
        };
      }

      return {
        allowed: true,
        current: 0,
        limit: 5,
        plan: "free",
        isOffline: false,
      };
    } catch (error) {
      console.error("患者数制限チェックエラー:", error);
      // エラー時はオフラインとして処理
      return {
        allowed: false,
        isOffline: true,
        message: "エラー発生: " + error.message,
      };
    }
  }

  // サブスクリプション有効性チェック
  async validateSubscription(subscription) {
    try {
      if (subscription.plan !== "premium") return false;

      // 有効期限をチェック
      if (subscription.currentPeriodEnd) {
        const endDate = subscription.currentPeriodEnd.toDate ?
          subscription.currentPeriodEnd.toDate() :
          new Date(subscription.currentPeriodEnd);

        return endDate > new Date();
      }

      return subscription.status === "active";
    } catch (error) {
      console.error("サブスクリプション検証エラー:", error);
      return false;
    }
  }

  // 無料プランに降格
  async downgradeToFreePlan() {
    try {
      if (!this.currentUser) return;

      console.log("プレミアムプランの期限切れを検出、無料プランに降格中...");

      const userRef = this.firestore.collection("users").doc(this.currentUser.uid);
      await userRef.update({
        "subscription.plan": "free",
        "subscription.status": "cancelled",
        "subscription.patientLimit": 5,
        "subscription.lastUpdated": firebase.firestore.FieldValue.serverTimestamp(),
      });

      this.showErrorMessage("プレミアムプランの有効期限が切れました。無料プランに戻りました。");

      // UIを更新
      if (window.stripeManager) {
        window.stripeManager.updateSubscriptionUI();
      }
    } catch (error) {
      console.error("プラン降格エラー:", error);
    }
  }

  // 使用量更新（Firestore版）
  async updatePatientCount(count) {
    try {
      if (!this.currentUser) return;

      console.log("Firebase使用量更新:", count);

      const userRef = this.firestore
        .collection("users")
        .doc(this.currentUser.uid);
      await userRef.update({
        "usage.patientCount": count,
        "usage.lastUpdated": firebase.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Firebase使用量更新完了:", count);

      // UI上の制限表示を更新
      this.updatePlanStatus(count);
    } catch (error) {
      console.error("使用量更新エラー:", error);
    }
  }

  // プラン状況表示の更新（サブスクリプション対応版）
  async updatePlanStatus(currentCount) {
    try {
      const planStatus = document.getElementById("plan-status");
      if (!planStatus || !this.currentUser) return;

      // 現在のユーザーデータを取得
      const userRef = this.firestore.collection("users").doc(this.currentUser.uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const subscription = userData.subscription || {};
        const plan = subscription.plan || "free";
        const limit = subscription.patientLimit || 5;

        if (plan === "premium") {
          // プレミアムプラン表示
          planStatus.innerHTML = `🌟 プレミアムプラン (${currentCount}人/無制限)`;
          planStatus.style.color = "#8e44ad";

          // 期限表示
          if (subscription.currentPeriodEnd) {
            const endDate = subscription.currentPeriodEnd.toDate ?
              subscription.currentPeriodEnd.toDate() :
              new Date(subscription.currentPeriodEnd);

            const endDateStr = endDate.toLocaleDateString('ja-JP');
            planStatus.title = `次回請求日: ${endDateStr}`;
          }
        } else {
          // 無料プラン表示
          const remaining = limit - currentCount;

          if (remaining <= 0) {
            planStatus.innerHTML = `⚠️ 無料プラン (${limit}/${limit}人) 上限到達`;
            planStatus.style.color = "#e74c3c";
          } else if (remaining <= 1) {
            planStatus.innerHTML = `⚠️ 無料プラン (${currentCount}/${limit}人) 残り${remaining}人`;
            planStatus.style.color = "#f39c12";
          } else {
            planStatus.innerHTML = `✓ 無料プラン (${currentCount}/${limit}人)`;
            planStatus.style.color = "#27ae60";
          }
        }
      }
    } catch (error) {
      console.error("プラン状況更新エラー:", error);
    }
  }

  // 患者作成時の制限チェックと更新（Firestore直接版）
  async handlePatientCreation() {
    try {
      if (!this.currentUser) {
        return {
          success: false,
          isOffline: true,
          message: "ログインが必要です",
        };
      }

      // 制限チェック
      const limitInfo = await this.checkPatientLimit();

      if (!limitInfo.allowed) {
        console.log("患者数制限に達しています");
        return {
          success: false,
          limitReached: true,
          limitInfo: limitInfo,
        };
      }

      return {
        success: true,
        limitInfo: limitInfo,
      };
    } catch (error) {
      console.error("患者作成処理エラー:", error);
      return {
        success: false,
        isOffline: true,
        message: "エラー発生: " + error.message,
      };
    }
  }

  // 患者削除時の使用量更新（自動同期版）
  async handlePatientDeletion() {
    try {
      if (!this.currentUser) return;

      // Firestoreから最新の患者数を取得
      await this.syncPatientCountFromFirestore();

      console.log("患者削除後の使用量更新完了");
    } catch (error) {
      console.error("患者削除後の使用量更新エラー:", error);
    }
  }

  // 成功メッセージ表示
  showSuccessMessage(message) {
    this.showMessage(message, "success");
  }

  // エラーメッセージ表示
  showErrorMessage(message) {
    this.showMessage(message, "error");
  }

  // メッセージ表示
  showMessage(message, type = "info") {
    // 既存のメッセージを削除
    const existingMessage = document.getElementById("firebase-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement("div");
    messageDiv.id = "firebase-message";

    const bgColor =
      type === "success" ? "#2ecc71" : type === "error" ? "#e74c3c" : "#3498db";

    messageDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10001;
      max-width: 350px;
      font-size: 14px;
      line-height: 1.4;
    `;

    messageDiv.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <div style="flex: 1;">${message}</div>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0;">×</button>
      </div>
    `;

    document.body.appendChild(messageDiv);

    // 自動削除
    setTimeout(
      () => {
        if (messageDiv.parentElement) {
          messageDiv.remove();
        }
      },
      type === "error" ? 8000 : 5000
    );
  }

  // Firebase利用可能かチェック
  isAvailable() {
    return this.isInitialized && window.firebase && this.auth;
  }

  // 現在のユーザー情報取得
  getCurrentUser() {
    return this.currentUser;
  }

  // デバッグ情報表示
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      hasFirebase: !!window.firebase,
      currentUser: this.currentUser
        ? {
            email: this.currentUser.email,
            uid: this.currentUser.uid,
          }
        : null,
      isAvailable: this.isAvailable(),
      authDomain: this.app?.options?.authDomain,
    };
  }
}

// グローバルインスタンス
const firebaseManager = new FirebaseManager();

// ウィンドウオブジェクトに登録
window.firebaseManager = firebaseManager;

// デバッグ用
window.fbDebug = () => {
  console.log("Firebase Debug Info:", firebaseManager.getDebugInfo());
};

// ページ読み込み時にリダイレクト結果をチェック
document.addEventListener("DOMContentLoaded", () => {
  if (firebaseManager.isInitialized) {
    firebaseManager.handleRedirectResult();
  }
});

