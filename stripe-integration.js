// Stripe統合フロントエンドコード
class StripeManager {
  constructor() {
    this.stripe = null;
    this.isInitialized = false;
    this.plans = {
      standard: {
        name: 'スタンダードプラン',
        price: '¥1,980/月',
        priceId: null, // 環境変数から設定
        patientLimit: 50,
        features: [
          '患者数: 50人まで',
          'データのクラウド保存',
          '高度な統計機能',
          'CSV一括エクスポート',
          '広告非表示'
        ]
      },
      pro: {
        name: 'プロプラン',
        price: '¥4,980/月',
        priceId: null, // 環境変数から設定
        patientLimit: -1, // 無制限
        features: [
          '患者数: 無制限',
          'データのクラウド保存',
          '高度な統計機能',
          'CSV一括エクスポート',
          '広告非表示',
          '優先サポート',
          'API連携（予定）'
        ]
      }
    };
  }

  // Stripe初期化
  async initialize() {
    try {
      // Stripe.js の読み込み確認
      if (typeof window.Stripe === 'undefined') {
        console.error('Stripe.js が読み込まれていません');
        return false;
      }

      // 公開キー取得
      const publishableKey = window.STRIPE_PUBLISHABLE_KEY || 'pk_test_51QEZ8mHeFSbSHfvdXhbM2RLjhrcJOF2KelYZojqJgFMbCPfGUbUfE4yLbqysDKa37EwZFOyFHpL0LLHDjGSKvQgW00v5qFBhXm';
      
      this.stripe = window.Stripe(publishableKey);
      
      // Price IDsを環境変数から取得
      this.plans.standard.priceId = window.STRIPE_STANDARD_PRICE_ID || 'price_1QEZMcHeFSbSHfvdU7z4KJjW';
      this.plans.pro.priceId = window.STRIPE_PRO_PRICE_ID || 'price_1QEZNYHeFSbSHfvdWFgjyXPz';

      this.isInitialized = true;
      console.log('Stripe初期化成功');
      
      // プラン選択UIを表示
      this.renderPlanSelection();
      
      return true;
    } catch (error) {
      console.error('Stripe初期化エラー:', error);
      return false;
    }
  }

  // プラン選択UI描画
  renderPlanSelection() {
    // 既存のUIを確認
    let planContainer = document.getElementById('plan-selection');
    
    if (!planContainer) {
      // 新規作成
      planContainer = document.createElement('div');
      planContainer.id = 'plan-selection';
      planContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        display: none;
      `;
      document.body.appendChild(planContainer);
    }

    planContainer.innerHTML = `
      <div style="
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
      ">
        <button onclick="stripeManager.closePlanSelection()" style="
          position: absolute;
          top: 15px;
          right: 20px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
        
        <h2 style="text-align: center; margin-bottom: 10px; color: #2c3e50;">
          プレミアムプランにアップグレード
        </h2>
        <p style="text-align: center; color: #7f8c8d; margin-bottom: 30px;">
          より多くの患者を管理し、高度な機能をご利用いただけます
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
          ${Object.keys(this.plans).map(planKey => this.renderPlanCard(planKey, this.plans[planKey])).join('')}
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #888; margin: 0;">
            ※ いつでもキャンセル可能です。キャンセル後は期間終了時に無料プランに戻ります。
          </p>
        </div>
      </div>
    `;
  }

  // プランカード描画
  renderPlanCard(planKey, plan) {
    return `
      <div style="
        border: 2px solid ${planKey === 'pro' ? '#3498db' : '#e9ecef'};
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        position: relative;
        background: ${planKey === 'pro' ? '#f8f9fa' : 'white'};
      ">
        ${planKey === 'pro' ? `
          <div style="
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: #3498db;
            color: white;
            padding: 5px 15px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
          ">人気</div>
        ` : ''}
        
        <h3 style="margin: 0 0 10px 0; color: #2c3e50;">${plan.name}</h3>
        <div style="font-size: 28px; font-weight: bold; color: #e74c3c; margin: 10px 0;">
          ${plan.price}
        </div>
        
        <ul style="
          list-style: none;
          padding: 0;
          margin: 20px 0;
          text-align: left;
        ">
          ${plan.features.map(feature => `
            <li style="
              padding: 8px 0;
              border-bottom: 1px solid #f1f2f6;
              display: flex;
              align-items: center;
            ">
              <span style="color: #27ae60; margin-right: 10px;">✓</span>
              ${feature}
            </li>
          `).join('')}
        </ul>
        
        <button onclick="stripeManager.startCheckout('${planKey}')" style="
          width: 100%;
          background: ${planKey === 'pro' ? '#3498db' : '#27ae60'};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        " onmouseover="this.style.background='${planKey === 'pro' ? '#2980b9' : '#219a52'}'" 
           onmouseout="this.style.background='${planKey === 'pro' ? '#3498db' : '#27ae60'}'">
          ${planKey === 'pro' ? 'プロプランを選択' : 'スタンダードプランを選択'}
        </button>
      </div>
    `;
  }

  // プラン選択画面を表示
  showPlanSelection() {
    const container = document.getElementById('plan-selection');
    if (container) {
      container.style.display = 'flex';
    }
  }

  // プラン選択画面を閉じる
  closePlanSelection() {
    const container = document.getElementById('plan-selection');
    if (container) {
      container.style.display = 'none';
    }
  }

  // Checkout開始
  async startCheckout(planKey) {
    try {
      if (!this.isInitialized) {
        throw new Error('Stripe が初期化されていません');
      }

      // ログインチェック
      if (!window.firebaseManager || !window.firebaseManager.getCurrentUser()) {
        alert('プレミアムプランのご利用にはログインが必要です。先にGoogleアカウントでログインしてください。');
        this.closePlanSelection();
        return;
      }

      const user = window.firebaseManager.getCurrentUser();
      const plan = this.plans[planKey];

      if (!plan || !plan.priceId) {
        throw new Error('プラン情報が不正です');
      }

      // ローディング表示
      this.showLoading('チェックアウトページを準備中...');

      console.log('Checkout開始:', planKey, plan.priceId);

      // Checkout Session作成API呼び出し
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          uid: user.uid,
          email: user.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Checkout作成に失敗しました');
      }

      const { url } = await response.json();

      // Stripeチェックアウトページにリダイレクト
      console.log('Stripeチェックアウトページへリダイレクト:', url);
      window.location.href = url;

    } catch (error) {
      console.error('Checkout開始エラー:', error);
      this.hideLoading();
      alert('プラン変更の処理でエラーが発生しました: ' + error.message);
    }
  }

  // サブスクリプション状況取得
  async getSubscriptionStatus() {
    try {
      const user = window.firebaseManager?.getCurrentUser();
      if (!user) {
        return { plan: 'free', status: 'inactive' };
      }

      const response = await fetch(`/api/subscription?uid=${user.uid}&action=get`);
      if (!response.ok) {
        throw new Error('サブスクリプション状況の取得に失敗しました');
      }

      return await response.json();
    } catch (error) {
      console.error('サブスクリプション状況取得エラー:', error);
      return { plan: 'free', status: 'inactive' };
    }
  }

  // サブスクリプションキャンセル
  async cancelSubscription() {
    try {
      const user = window.firebaseManager?.getCurrentUser();
      if (!user) {
        throw new Error('ログインが必要です');
      }

      if (!confirm('サブスクリプションをキャンセルしますか？現在の期間終了時に無料プランに戻ります。')) {
        return;
      }

      this.showLoading('キャンセル処理中...');

      const response = await fetch(`/api/subscription?uid=${user.uid}&action=cancel`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'キャンセルに失敗しました');
      }

      const result = await response.json();
      
      this.hideLoading();
      alert('サブスクリプションのキャンセルが完了しました。' + 
            new Date(result.cancelAt).toLocaleDateString() + 'に無料プランに戻ります。');
      
      // UIを更新
      this.updateSubscriptionUI();

    } catch (error) {
      console.error('サブスクリプションキャンセルエラー:', error);
      this.hideLoading();
      alert('キャンセル処理でエラーが発生しました: ' + error.message);
    }
  }

  // サブスクリプション再開
  async reactivateSubscription() {
    try {
      const user = window.firebaseManager?.getCurrentUser();
      if (!user) {
        throw new Error('ログインが必要です');
      }

      this.showLoading('再開処理中...');

      const response = await fetch(`/api/subscription?uid=${user.uid}&action=reactivate`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '再開に失敗しました');
      }

      this.hideLoading();
      alert('サブスクリプションが再開されました。');
      
      // UIを更新
      this.updateSubscriptionUI();

    } catch (error) {
      console.error('サブスクリプション再開エラー:', error);
      this.hideLoading();
      alert('再開処理でエラーが発生しました: ' + error.message);
    }
  }

  // サブスクリプションUI更新
  async updateSubscriptionUI() {
    try {
      const status = await this.getSubscriptionStatus();
      const planStatus = document.getElementById('plan-status');
      
      if (planStatus && status.subscription) {
        const sub = status.subscription;
        let statusText = '';
        let statusColor = '#27ae60';

        if (sub.plan === 'free') {
          statusText = `✓ 無料プラン (${status.usage.patientCount || 0}/5人)`;
        } else if (sub.status === 'active') {
          const limit = sub.patientLimit === -1 ? '無制限' : sub.patientLimit;
          statusText = `✓ ${this.plans[sub.plan]?.name || sub.plan} (${status.usage.patientCount || 0}/${limit}人)`;
        } else if (sub.status === 'cancel_at_period_end') {
          statusText = `⚠️ ${this.plans[sub.plan]?.name || sub.plan} (キャンセル予定)`;
          statusColor = '#f39c12';
        } else {
          statusText = `❌ ${this.plans[sub.plan]?.name || sub.plan} (${sub.status})`;
          statusColor = '#e74c3c';
        }

        planStatus.innerHTML = statusText;
        planStatus.style.color = statusColor;
      }
    } catch (error) {
      console.error('サブスクリプションUI更新エラー:', error);
    }
  }

  // ローディング表示
  showLoading(message = '処理中...') {
    let loadingDiv = document.getElementById('stripe-loading');
    if (!loadingDiv) {
      loadingDiv = document.createElement('div');
      loadingDiv.id = 'stripe-loading';
      document.body.appendChild(loadingDiv);
    }

    loadingDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    loadingDiv.innerHTML = `
      <div style="
        background: white;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
      ">
        <div style="
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px auto;
        "></div>
        <p style="margin: 0; color: #2c3e50;">${message}</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  // ローディング非表示
  hideLoading() {
    const loadingDiv = document.getElementById('stripe-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  // Checkoutの結果処理
  handleCheckoutResult() {
    const urlParams = new URLSearchParams(window.location.search);
    const checkout = urlParams.get('checkout');
    
    if (checkout === 'success') {
      // 成功時の処理
      setTimeout(() => {
        alert('プレミアムプランへのアップグレードが完了しました！新機能をお楽しみください。');
        this.updateSubscriptionUI();
        // URLパラメータをクリア
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1000);
    } else if (checkout === 'cancel') {
      // キャンセル時の処理
      alert('プラン変更がキャンセルされました。');
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // 患者制限チェック（Stripe版）
  async checkPatientLimit() {
    try {
      const user = window.firebaseManager?.getCurrentUser();
      if (!user) {
        return { allowed: false, isOffline: true, message: 'ログインが必要です' };
      }

      const status = await this.getSubscriptionStatus();
      
      if (status.subscription.plan === 'free') {
        const limit = 5;
        const current = status.usage.patientCount || 0;
        return {
          allowed: current < limit,
          current: current,
          limit: limit,
          plan: 'free',
          showUpgrade: current >= limit
        };
      } else {
        const limit = status.subscription.patientLimit;
        const current = status.usage.patientCount || 0;
        return {
          allowed: limit === -1 || current < limit,
          current: current,
          limit: limit,
          plan: status.subscription.plan
        };
      }
    } catch (error) {
      console.error('患者制限チェックエラー:', error);
      return { allowed: false, isOffline: true, message: 'エラー: ' + error.message };
    }
  }

  // 利用状況確認
  isAvailable() {
    return this.isInitialized && !!this.stripe;
  }
}

// グローバルインスタンス
const stripeManager = new StripeManager();
window.stripeManager = stripeManager;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
  // Stripe.jsの読み込み後に初期化
  if (typeof window.Stripe !== 'undefined') {
    stripeManager.initialize();
  } else {
    // Stripe.js読み込み待ち
    const checkStripe = setInterval(() => {
      if (typeof window.Stripe !== 'undefined') {
        clearInterval(checkStripe);
        stripeManager.initialize();
      }
    }, 100);
  }

  // Checkout結果の処理
  stripeManager.handleCheckoutResult();
});