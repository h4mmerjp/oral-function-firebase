// Stripe統合管理クラス
class StripeManager {
  constructor() {
    this.stripe = null;
    this.isInitialized = false;
    this.elements = null;
    this.customerId = null;
    this.subscriptionStatus = null;
  }

  // Stripe初期化
  async initialize() {
    try {
      // Stripe.jsライブラリの読み込み確認
      if (typeof Stripe === 'undefined') {
        console.error('Stripe.js が読み込まれていません');
        return false;
      }

      // Stripeインスタンス作成
      this.stripe = Stripe(window.firebaseManager.stripeConfig.publishableKey);
      this.isInitialized = true;

      console.log('Stripe初期化完了');
      return true;
    } catch (error) {
      console.error('Stripe初期化エラー:', error);
      return false;
    }
  }

  // プレミアムプランへのアップグレード
  async upgradeToPremium() {
    try {
      if (!this.isInitialized) {
        throw new Error('Stripeが初期化されていません');
      }

      if (!window.firebaseManager.currentUser) {
        throw new Error('ログインが必要です');
      }

      console.log('プレミアムプランへのアップグレード開始');

      // 現在のサブスクリプション状態をチェック
      const userDoc = await this.getCurrentUserData();
      if (userDoc && userDoc.subscription?.plan === 'premium') {
        window.firebaseManager.showErrorMessage('既にプレミアムプランです');
        return;
      }

      // Stripe Checkoutセッション作成のためのAPI呼び出し
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: window.firebaseManager.stripeConfig.priceId,
          userId: window.firebaseManager.currentUser.uid,
          userEmail: window.firebaseManager.currentUser.email,
          successUrl: window.firebaseManager.stripeConfig.successUrl,
          cancelUrl: window.firebaseManager.stripeConfig.cancelUrl
        })
      });

      if (!response.ok) {
        throw new Error('チェックアウトセッションの作成に失敗しました');
      }

      const { sessionId } = await response.json();

      // Stripe Checkoutにリダイレクト
      const { error } = await this.stripe.redirectToCheckout({
        sessionId: sessionId
      });

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('アップグレードエラー:', error);
      window.firebaseManager.showErrorMessage('アップグレードに失敗しました: ' + error.message);
    }
  }

  // サブスクリプションのキャンセル
  async cancelSubscription() {
    try {
      if (!window.firebaseManager.currentUser) {
        throw new Error('ログインが必要です');
      }

      // ユーザー確認
      const confirmed = confirm(
        'プレミアムプランをキャンセルしますか？\n' +
        '次回請求日まではプレミアム機能をご利用いただけます。'
      );

      if (!confirmed) return;

      console.log('サブスクリプションキャンセル開始');

      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: window.firebaseManager.currentUser.uid
        })
      });

      if (!response.ok) {
        throw new Error('キャンセル処理に失敗しました');
      }

      const result = await response.json();

      window.firebaseManager.showSuccessMessage('サブスクリプションをキャンセルしました');

      // UIを更新
      this.updateSubscriptionUI();

    } catch (error) {
      console.error('キャンセルエラー:', error);
      window.firebaseManager.showErrorMessage('キャンセルに失敗しました: ' + error.message);
    }
  }

  // 現在のユーザードキュメントを取得
  async getCurrentUserData() {
    try {
      if (!window.firebaseManager.currentUser) return null;

      const userRef = window.firebaseManager.firestore
        .collection('users')
        .doc(window.firebaseManager.currentUser.uid);

      const userDoc = await userRef.get();
      return userDoc.exists ? userDoc.data() : null;
    } catch (error) {
      console.error('ユーザーデータ取得エラー:', error);
      return null;
    }
  }

  // サブスクリプション状態を更新（Webhook用）
  async updateSubscriptionStatus(subscriptionData) {
    try {
      if (!window.firebaseManager.currentUser) return;

      const userRef = window.firebaseManager.firestore
        .collection('users')
        .doc(window.firebaseManager.currentUser.uid);

      const updateData = {
        'subscription.plan': subscriptionData.status === 'active' ? 'premium' : 'free',
        'subscription.stripeCustomerId': subscriptionData.customerId,
        'subscription.stripeSubscriptionId': subscriptionData.subscriptionId,
        'subscription.status': subscriptionData.status,
        'subscription.currentPeriodStart': new Date(subscriptionData.currentPeriodStart * 1000),
        'subscription.currentPeriodEnd': new Date(subscriptionData.currentPeriodEnd * 1000),
        'subscription.patientLimit': subscriptionData.status === 'active' ? 999 : 5, // プレミアムは実質無制限
        'subscription.lastUpdated': window.firebaseManager.firestore.FieldValue.serverTimestamp()
      };

      await userRef.update(updateData);

      console.log('サブスクリプション状態更新完了:', subscriptionData.status);

      // UIを更新
      this.updateSubscriptionUI();

    } catch (error) {
      console.error('サブスクリプション状態更新エラー:', error);
    }
  }

  // サブスクリプション状態をチェック
  async checkSubscriptionStatus() {
    try {
      const userData = await this.getCurrentUserData();
      if (!userData) return 'free';

      const subscription = userData.subscription || {};

      // サブスクリプションの有効期限をチェック
      if (subscription.plan === 'premium' && subscription.currentPeriodEnd) {
        const endDate = subscription.currentPeriodEnd.toDate ?
          subscription.currentPeriodEnd.toDate() :
          new Date(subscription.currentPeriodEnd);

        if (endDate > new Date()) {
          return 'premium';
        }
      }

      return 'free';
    } catch (error) {
      console.error('サブスクリプション状態チェックエラー:', error);
      return 'free';
    }
  }

  // サブスクリプションUIを更新
  async updateSubscriptionUI() {
    try {
      const userData = await this.getCurrentUserData();
      const planStatus = document.getElementById('plan-status');
      const upgradeBtn = document.getElementById('upgrade-btn');
      const cancelBtn = document.getElementById('cancel-subscription-btn');

      if (!userData || !planStatus) return;

      const subscription = userData.subscription || {};
      const usage = userData.usage || {};
      const plan = subscription.plan || 'free';
      const currentCount = usage.patientCount || 0;

      if (plan === 'premium') {
        // プレミアムプラン表示
        planStatus.innerHTML = `🌟 プレミアムプラン (${currentCount}人/無制限)`;
        planStatus.style.color = '#8e44ad';

        if (upgradeBtn) upgradeBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

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
        const remaining = 5 - currentCount;

        if (remaining <= 0) {
          planStatus.innerHTML = "⚠️ 無料プラン (5/5人) 上限到達";
          planStatus.style.color = "#e74c3c";
        } else if (remaining <= 1) {
          planStatus.innerHTML = `⚠️ 無料プラン (${currentCount}/5人) 残り${remaining}人`;
          planStatus.style.color = "#f39c12";
        } else {
          planStatus.innerHTML = `✓ 無料プラン (${currentCount}/5人)`;
          planStatus.style.color = "#27ae60";
        }

        if (upgradeBtn) upgradeBtn.style.display = 'inline-block';
        if (cancelBtn) cancelBtn.style.display = 'none';
      }

    } catch (error) {
      console.error('サブスクリプションUI更新エラー:', error);
    }
  }

  // 決済成功時の処理
  handlePaymentSuccess() {
    window.firebaseManager.showSuccessMessage(
      'プレミアムプランへのアップグレードが完了しました！無制限で患者登録が可能です。'
    );

    // UIを更新
    setTimeout(() => {
      this.updateSubscriptionUI();
      if (window.patientManager) {
        window.patientManager.updatePatientLimitUI();
      }
    }, 1000);
  }

  // 決済キャンセル時の処理
  handlePaymentCancel() {
    window.firebaseManager.showErrorMessage(
      'アップグレードがキャンセルされました。'
    );
  }

  // URLパラメータをチェックして決済結果を処理
  handlePaymentCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const subscription = urlParams.get('subscription');

    if (subscription === 'success') {
      this.handlePaymentSuccess();
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (subscription === 'cancelled') {
      this.handlePaymentCancel();
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // 利用可能かチェック
  isAvailable() {
    return this.isInitialized && this.stripe;
  }

  // デバッグ情報
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      hasStripe: !!this.stripe,
      customerId: this.customerId,
      subscriptionStatus: this.subscriptionStatus,
      publishableKey: window.firebaseManager.stripeConfig.publishableKey
    };
  }
}

// グローバルインスタンス
const stripeManager = new StripeManager();

// ウィンドウオブジェクトに登録
window.stripeManager = stripeManager;

// デバッグ用
window.stripeDebug = () => {
  console.log('Stripe Debug Info:', stripeManager.getDebugInfo());
};

// ページ読み込み時に決済結果をチェック
document.addEventListener('DOMContentLoaded', () => {
  stripeManager.handlePaymentCallback();
});