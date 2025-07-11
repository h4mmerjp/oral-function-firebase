// Firebase設定とSDK初期化（認証エラー修正版）
// 既存のローカルデータベースは温存し、Firebase機能を段階的に追加

class FirebaseManager {
  constructor() {
    this.app = null;
    this.auth = null;
    this.firestore = null;
    this.currentUser = null;
    this.isInitialized = false;
    
    console.log('FirebaseManager 初期化開始');
  }

  // Firebase初期化
  async initialize() {
    try {
      // Firebase SDK の存在確認
      if (typeof window.firebase === 'undefined') {
        console.error('Firebase SDK が読み込まれていません');
        return false;
      }

      // Firebase設定
      const firebaseConfig = {
        apiKey: "AIzaSyC8_B2eo47C2plYkGPq_ek6VaD113tNEBk",
        authDomain: "oral-health-diagnosis-ap-b3592.firebaseapp.com",
        projectId: "oral-health-diagnosis-ap-b3592",
        storageBucket: "oral-health-diagnosis-ap-b3592.firebasestorage.app",
        messagingSenderId: "338073541462",
        appId: "1:338073541462:web:f48f281cf84710ce7794f7",
        measurementId: "G-XLQ1FVCHN5"
      };

      // Firebase初期化
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(firebaseConfig);
        console.log('Firebase アプリ初期化完了');
      } else {
        this.app = firebase.app();
      }

      // サービス初期化
      this.auth = firebase.auth();
      this.firestore = firebase.firestore();
      
      // Firestore設定（警告を抑制）
      try {
        this.firestore.settings({
          cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
          merge: true
        });
      } catch (error) {
        console.log('Firestore設定警告（無視して継続）:', error.message);
      }
      
      // 認証状態の監視
      this.setupAuthListener();
      
      this.isInitialized = true;
      console.log('Firebase 初期化完了');
      
      return true;
    } catch (error) {
      console.error('Firebase 初期化エラー:', error);
      console.log('ローカルモードで続行します');
      return false;
    }
  }

  // 認証状態監視
  setupAuthListener() {
    this.auth.onAuthStateChanged(async (user) => {
      console.log('認証状態変更:', user ? `ログイン: ${user.email}` : 'ログアウト');
      this.currentUser = user;
      
      if (user) {
        await this.onUserLogin(user);
      } else {
        this.onUserLogout();
      }
    });
  }

  // ユーザーログイン時の処理
  async onUserLogin(user) {
    try {
      console.log('ユーザーログイン処理開始:', user.email);
      
      // ユーザー情報をFirestoreに保存/更新
      await this.ensureUserDocument(user);
      
      // ローカルデータベースの患者数をFirebaseに同期
      await this.syncLocalPatientCountToFirebase();
      
      // UI更新
      this.updateAuthUI(true, user);
      
      // 患者一覧を再読み込み（制限情報表示のため）
      if (window.patientManager) {
        await patientManager.loadPatients();
      }
      
      console.log('ユーザーログイン処理完了');
      
    } catch (error) {
      console.error('ログイン処理エラー:', error);
      this.showErrorMessage('ログイン処理でエラーが発生しました: ' + error.message);
    }
  }

  // ローカルデータベースの患者数をFirebaseに同期
  async syncLocalPatientCountToFirebase() {
    try {
      if (!this.currentUser || !window.db) return;
      
      console.log('ローカル患者数をFirebaseに同期開始');
      
      // ローカルデータベースから患者数を取得
      const localPatients = await db.getPatients();
      const localPatientCount = localPatients.length;
      
      console.log('ローカル患者数:', localPatientCount);
      
      // Firebaseの使用量を更新
      await this.updatePatientCount(localPatientCount);
      
      console.log('患者数同期完了:', localPatientCount);
      
    } catch (error) {
      console.error('患者数同期エラー:', error);
    }
  }

  // ユーザーログアウト時の処理
  onUserLogout() {
    console.log('ユーザーログアウト処理');
    
    // UI更新
    this.updateAuthUI(false, null);
    
    // 患者一覧を再読み込み（制限情報を非表示にするため）
    if (window.patientManager) {
      patientManager.loadPatients();
    }
    
    console.log('ローカルデータベースモードに切り替え');
  }

  // ユーザードキュメントの作成/確認
  async ensureUserDocument(user) {
    try {
      const userRef = this.firestore.collection('users').doc(user.uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        // 新規ユーザーの場合、基本情報を作成
        const userData = {
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          subscription: {
            plan: 'free',
            startDate: firebase.firestore.FieldValue.serverTimestamp(),
            endDate: null,
            patientLimit: 5
          },
          usage: {
            patientCount: 0,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          }
        };
        
        await userRef.set(userData);
        console.log('新規ユーザー作成:', user.email);
        
        // 新規ユーザー通知
        this.showSuccessMessage('新規アカウントが作成されました！無料プランで5人まで患者登録が可能です。');
      } else {
        console.log('既存ユーザー:', user.email);
        
        // 既存ユーザー歓迎メッセージ
        const userData = userDoc.data();
        const plan = userData.subscription?.plan || 'free';
        this.showSuccessMessage(`おかえりなさい！${plan === 'free' ? '無料プラン' : 'プレミアムプラン'}でログインしました。`);
      }
    } catch (error) {
      console.error('ユーザードキュメント作成エラー:', error);
      throw error;
    }
  }

  // Google認証でログイン（修正版）
  async signInWithGoogle() {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase が初期化されていません');
      }

      console.log('Google認証開始');
      
      // プロバイダー設定
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // カスタムパラメータ設定
      provider.setCustomParameters({
        prompt: 'select_account',
        // ホスト名を明示的に指定
        hd: '' // 特定ドメインに制限しない
      });
      
      // 【修正】リダイレクト方式も試行できるようにする
      let result;
      
      try {
        // まずポップアップ方式を試行
        console.log('ポップアップ方式でGoogle認証を試行');
        result = await this.auth.signInWithPopup(provider);
      } catch (popupError) {
        console.log('ポップアップ方式が失敗、リダイレクト方式を試行:', popupError.code);
        
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/cancelled-popup-request') {
          // ポップアップがブロックされた場合はリダイレクト方式
          console.log('リダイレクト方式に切り替え');
          await this.auth.signInWithRedirect(provider);
          return; // リダイレクト後に認証状態が変更される
        } else {
          throw popupError; // その他のエラーは再スロー
        }
      }
      
      console.log('Google認証成功:', result.user.email);
      return result.user;
      
    } catch (error) {
      console.error('Google認証エラー:', error);
      
      // エラーメッセージの詳細化
      let errorMessage = 'ログインに失敗しました';
      
      switch(error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'ログインがキャンセルされました';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認してください';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'ログイン処理がキャンセルされました';
          break;
        case 'auth/unauthorized-domain':
          errorMessage = 'このドメインからのログインは許可されていません。Firebase設定を確認してください';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Google認証が有効になっていません。Firebase設定を確認してください';
          break;
        default:
          errorMessage = `ログインに失敗しました: ${error.message}`;
      }
      
      this.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // 【新規追加】リダイレクト結果の処理
  async handleRedirectResult() {
    try {
      const result = await this.auth.getRedirectResult();
      if (result.user) {
        console.log('リダイレクト認証成功:', result.user.email);
        return result.user;
      }
    } catch (error) {
      console.error('リダイレクト認証エラー:', error);
      this.showErrorMessage('認証に失敗しました: ' + error.message);
    }
    return null;
  }

  // ログアウト
  async signOut() {
    try {
      await this.auth.signOut();
      console.log('ログアウト完了');
      this.showSuccessMessage('ログアウトしました');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      this.showErrorMessage('ログアウトに失敗しました');
      throw error;
    }
  }

  // 認証UI更新
  updateAuthUI(isLoggedIn, user) {
    let authContainer = document.getElementById('auth-container');
    
    if (!authContainer) {
      // 認証コンテナが存在しない場合は作成
      authContainer = document.createElement('div');
      authContainer.id = 'auth-container';
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
      
      const header = document.querySelector('header');
      if (header) {
        header.style.position = 'relative';
        header.appendChild(authContainer);
      }
    }
    
    if (isLoggedIn && user) {
      authContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          ${user.photoURL ? `<img src="${user.photoURL}" alt="プロフィール" style="width: 32px; height: 32px; border-radius: 50%;">` : ''}
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: bold; color: #2c3e50;">${user.displayName || user.email}</div>
            <div style="font-size: 12px; color: #27ae60;">✓ 無料プラン (5人まで)</div>
          </div>
          <button onclick="firebaseManager.signOut()" class="btn-secondary" style="padding: 6px 12px; font-size: 12px;">ログアウト</button>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 14px; margin-bottom: 8px; color: #666;">ローカルモード</div>
          <button onclick="firebaseManager.signInWithGoogle()" class="btn-success" style="padding: 8px 16px; font-size: 12px; white-space: nowrap;">Googleでログイン</button>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">患者数無制限</div>
        </div>
      `;
    }
  }

  // 患者数制限チェック
  async checkPatientLimit() {
    try {
      if (!this.currentUser) {
        // ログインしていない場合はローカル制限なし
        return { allowed: true, isLocal: true };
      }

      const userRef = this.firestore.collection('users').doc(this.currentUser.uid);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const subscription = userData.subscription || {};
        const usage = userData.usage || {};
        
        const limit = subscription.patientLimit || 5;
        const current = usage.patientCount || 0;
        
        console.log('制限チェック結果:', { current, limit, allowed: current < limit });
        
        return {
          allowed: current < limit,
          current: current,
          limit: limit,
          plan: subscription.plan || 'free',
          isLocal: false
        };
      }
      
      return { allowed: true, isLocal: true };
    } catch (error) {
      console.error('患者数制限チェックエラー:', error);
      // エラー時はローカルモードとして動作
      return { allowed: true, isLocal: true };
    }
  }

  // 使用量更新
  async updatePatientCount(count) {
    try {
      if (!this.currentUser) return;
      
      console.log('Firebase使用量更新:', count);
      
      const userRef = this.firestore.collection('users').doc(this.currentUser.uid);
      await userRef.update({
        'usage.patientCount': count,
        'usage.lastUpdated': firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Firebase使用量更新完了:', count);
      
    } catch (error) {
      console.error('使用量更新エラー:', error);
    }
  }

  // 患者追加時の制限チェックと更新
  async handlePatientCreation() {
    try {
      if (!this.currentUser) {
        // ローカルモードの場合は制限なし
        return { success: true, isLocal: true };
      }
      
      // 制限チェック
      const limitInfo = await this.checkPatientLimit();
      
      if (!limitInfo.allowed) {
        console.log('患者数制限に達しています');
        return { 
          success: false, 
          limitReached: true, 
          limitInfo: limitInfo 
        };
      }
      
      // ローカルデータベースから現在の患者数を取得
      const localPatients = await db.getPatients();
      const newCount = localPatients.length;
      
      // Firebase使用量を更新
      await this.updatePatientCount(newCount);
      
      return { 
        success: true, 
        newCount: newCount,
        limitInfo: limitInfo 
      };
      
    } catch (error) {
      console.error('患者作成処理エラー:', error);
      // エラー時はローカルモードとして動作
      return { success: true, isLocal: true };
    }
  }

  // 患者削除時の使用量更新
  async handlePatientDeletion() {
    try {
      if (!this.currentUser) return;
      
      // ローカルデータベースから現在の患者数を取得
      const localPatients = await db.getPatients();
      const newCount = localPatients.length;
      
      // Firebase使用量を更新
      await this.updatePatientCount(newCount);
      
      console.log('患者削除後の使用量更新完了:', newCount);
      
    } catch (error) {
      console.error('患者削除後の使用量更新エラー:', error);
    }
  }

  // 成功メッセージ表示
  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  // エラーメッセージ表示
  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  // メッセージ表示
  showMessage(message, type = 'info') {
    // 既存のメッセージを削除
    const existingMessage = document.getElementById('firebase-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.id = 'firebase-message';
    
    const bgColor = type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db';
    
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
    setTimeout(() => {
      if (messageDiv.parentElement) {
        messageDiv.remove();
      }
    }, type === 'error' ? 8000 : 5000);
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
      currentUser: this.currentUser ? {
        email: this.currentUser.email,
        uid: this.currentUser.uid
      } : null,
      isAvailable: this.isAvailable(),
      authDomain: this.app?.options?.authDomain
    };
  }
}

// グローバルインスタンス
const firebaseManager = new FirebaseManager();

// ウィンドウオブジェクトに登録
window.firebaseManager = firebaseManager;

// デバッグ用（開発中のみ）
window.fbDebug = () => {
  console.log('Firebase Debug Info:', firebaseManager.getDebugInfo());
};

// ページ読み込み時にリダイレクト結果をチェック
document.addEventListener('DOMContentLoaded', () => {
  if (firebaseManager.isInitialized) {
    firebaseManager.handleRedirectResult();
  }
});

console.log('firebase-config.js 読み込み完了');