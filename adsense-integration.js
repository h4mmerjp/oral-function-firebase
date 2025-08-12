// Google AdSense統合コード
class AdSenseManager {
  constructor() {
    this.isInitialized = false;
    this.adsLoaded = false;
    this.publisherId = 'ca-pub-3650557299577527'; // 既存のpublisher ID
    this.adUnits = {
      sidebar: {
        id: 'adsense-sidebar',
        slot: 'auto',
        format: 'auto',
        fullWidthResponsive: true,
        className: 'adsense-sidebar'
      },
      footer: {
        id: 'adsense-footer',
        slot: 'auto',
        format: 'auto',
        fullWidthResponsive: true,
        className: 'adsense-footer'
      },
      content: {
        id: 'adsense-content',
        slot: 'auto',
        format: 'fluid',
        fullWidthResponsive: true,
        className: 'adsense-content'
      }
    };
    
    // 広告を表示しないページのパターン
    this.restrictedPages = [
      '/assessment', // 検査ページ
      '/diagnosis',  // 診断ページ
      '/patient-info', // 患者詳細
      'patient-history' // 履歴ページ
    ];
  }

  // AdSense初期化
  async initialize() {
    try {
      // AdSenseスクリプトの読み込み確認
      if (!this.isAdSenseScriptLoaded()) {
        console.log('AdSenseスクリプトが読み込まれていません');
        return false;
      }

      // ユーザーのサブスクリプション状況をチェック
      if (await this.shouldHideAds()) {
        console.log('有料ユーザーのため広告を非表示にします');
        this.hideAllAds();
        return true;
      }

      // 医療コンテンツページでは広告を表示しない
      if (this.isRestrictedPage()) {
        console.log('制限されたページのため広告を表示しません');
        return true;
      }

      // 広告ユニットを挿入
      this.insertAdUnits();
      
      // AdSense初期化
      await this.loadAds();
      
      this.isInitialized = true;
      console.log('AdSense初期化完了');
      
      return true;
    } catch (error) {
      console.error('AdSense初期化エラー:', error);
      return false;
    }
  }

  // AdSenseスクリプトが読み込まれているかチェック
  isAdSenseScriptLoaded() {
    return typeof window.adsbygoogle !== 'undefined';
  }

  // 有料ユーザーかどうかチェック
  async shouldHideAds() {
    try {
      // Firebase認証状況を確認
      const user = window.firebaseManager?.getCurrentUser();
      if (!user) {
        return false; // ログインしていない場合は広告表示
      }

      // Stripe統合があれば使用、なければFirebaseから直接取得
      if (window.stripeManager?.isAvailable()) {
        const status = await window.stripeManager.getSubscriptionStatus();
        const plan = status.subscription?.plan || 'free';
        const subscriptionStatus = status.subscription?.status || 'inactive';
        
        return plan !== 'free' && subscriptionStatus === 'active';
      } else if (window.firebaseManager?.isAvailable()) {
        // Firebase直接チェック
        const limitInfo = await window.firebaseManager.checkPatientLimit();
        return limitInfo.plan !== 'free';
      }
      
      return false;
    } catch (error) {
      console.error('サブスクリプション状況チェックエラー:', error);
      return false; // エラー時は広告表示
    }
  }

  // 制限されたページかどうかチェック
  isRestrictedPage() {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    
    // URLパスまたはハッシュが制限リストに含まれているかチェック
    return this.restrictedPages.some(restricted => 
      currentPath.includes(restricted) || currentHash.includes(restricted)
    );
  }

  // タブ変更時のチェック（SPAでのページ遷移対応）
  onTabChange(tabId) {
    const isRestricted = this.restrictedPages.some(restricted => 
      tabId.includes(restricted.replace('/', ''))
    );
    
    if (isRestricted) {
      this.hideAllAds();
      console.log('制限されたタブに移動したため広告を非表示');
    } else if (!this.shouldHideAds()) {
      this.showAllAds();
      console.log('一般タブに移動したため広告を表示');
    }
  }

  // 広告ユニットをHTMLに挿入
  insertAdUnits() {
    // サイドバー広告
    this.insertSidebarAd();
    
    // フッター広告
    this.insertFooterAd();
    
    // コンテンツ内広告
    this.insertContentAd();
  }

  // サイドバー広告挿入
  insertSidebarAd() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer && !document.getElementById(this.adUnits.sidebar.id)) {
      const adContainer = document.createElement('div');
      adContainer.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        text-align: center;
      `;
      
      adContainer.innerHTML = `
        <div style="font-size: 12px; color: #888; margin-bottom: 10px;">スポンサー</div>
        <ins class="adsbygoogle ${this.adUnits.sidebar.className}"
             style="display:block"
             data-ad-client="${this.publisherId}"
             data-ad-slot="${this.adUnits.sidebar.slot}"
             data-ad-format="${this.adUnits.sidebar.format}"
             data-full-width-responsive="${this.adUnits.sidebar.fullWidthResponsive}"
             id="${this.adUnits.sidebar.id}">
        </ins>
      `;
      
      authContainer.parentElement.appendChild(adContainer);
    }
  }

  // フッター広告挿入
  insertFooterAd() {
    const footer = document.querySelector('.app-footer');
    if (footer && !document.getElementById(this.adUnits.footer.id)) {
      const adContainer = document.createElement('div');
      adContainer.style.cssText = `
        text-align: center;
        padding: 20px 0;
        border-bottom: 1px solid #eee;
        margin-bottom: 20px;
      `;
      
      adContainer.innerHTML = `
        <div style="font-size: 12px; color: #888; margin-bottom: 10px;">広告</div>
        <ins class="adsbygoogle ${this.adUnits.footer.className}"
             style="display:block"
             data-ad-client="${this.publisherId}"
             data-ad-slot="${this.adUnits.footer.slot}"
             data-ad-format="${this.adUnits.footer.format}"
             data-full-width-responsive="${this.adUnits.footer.fullWidthResponsive}"
             id="${this.adUnits.footer.id}">
        </ins>
      `;
      
      footer.insertBefore(adContainer, footer.firstChild);
    }
  }

  // コンテンツ内広告挿入
  insertContentAd() {
    const container = document.querySelector('.container');
    if (container && !document.getElementById(this.adUnits.content.id)) {
      const tabsElement = document.querySelector('.tabs');
      
      if (tabsElement) {
        const adContainer = document.createElement('div');
        adContainer.style.cssText = `
          text-align: center;
          padding: 20px 0;
          margin: 20px 0;
        `;
        
        adContainer.innerHTML = `
          <div style="font-size: 12px; color: #888; margin-bottom: 10px;">広告</div>
          <ins class="adsbygoogle ${this.adUnits.content.className}"
               style="display:block"
               data-ad-client="${this.publisherId}"
               data-ad-slot="${this.adUnits.content.slot}"
               data-ad-format="${this.adUnits.content.format}"
               data-full-width-responsive="${this.adUnits.content.fullWidthResponsive}"
               id="${this.adUnits.content.id}">
          </ins>
        `;
        
        // タブの直後に挿入
        tabsElement.insertAdjacentElement('afterend', adContainer);
      }
    }
  }

  // 広告の読み込み
  async loadAds() {
    try {
      if (!this.isAdSenseScriptLoaded()) {
        throw new Error('AdSenseスクリプトが読み込まれていません');
      }

      // 各広告ユニットを有効化
      const adElements = document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])');
      
      for (const adElement of adElements) {
        try {
          (adsbygoogle = window.adsbygoogle || []).push({});
          console.log('AdSense広告ユニットを読み込み:', adElement.id);
        } catch (error) {
          console.error('個別広告ユニット読み込みエラー:', error);
        }
      }

      this.adsLoaded = true;
      console.log('AdSense広告読み込み完了');

    } catch (error) {
      console.error('AdSense広告読み込みエラー:', error);
    }
  }

  // 全広告を非表示
  hideAllAds() {
    const adElements = document.querySelectorAll('.adsbygoogle');
    adElements.forEach(ad => {
      if (ad.closest('div')) {
        ad.closest('div').style.display = 'none';
      }
    });
    console.log('全ての広告を非表示にしました');
  }

  // 全広告を表示
  showAllAds() {
    const adElements = document.querySelectorAll('.adsbygoogle');
    adElements.forEach(ad => {
      if (ad.closest('div')) {
        ad.closest('div').style.display = 'block';
      }
    });
    console.log('全ての広告を表示しました');
  }

  // 広告を削除
  removeAllAds() {
    Object.values(this.adUnits).forEach(unit => {
      const adElement = document.getElementById(unit.id);
      if (adElement && adElement.parentElement) {
        adElement.parentElement.remove();
      }
    });
    console.log('全ての広告を削除しました');
  }

  // サブスクリプション状況変更時の処理
  async onSubscriptionChange() {
    try {
      const shouldHide = await this.shouldHideAds();
      
      if (shouldHide) {
        this.hideAllAds();
        // オプション: 完全に削除する場合
        // this.removeAllAds();
      } else if (!this.isRestrictedPage()) {
        // 広告が存在しない場合は新たに挿入
        if (!document.querySelector('.adsbygoogle')) {
          this.insertAdUnits();
          await this.loadAds();
        } else {
          this.showAllAds();
        }
      }
    } catch (error) {
      console.error('サブスクリプション変更時の広告制御エラー:', error);
    }
  }

  // パフォーマンス監視
  monitorPerformance() {
    // Core Web Vitals への影響を監視
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              console.log('LCP with ads:', entry.startTime);
              
              // LCP が 2.5s を超える場合は警告
              if (entry.startTime > 2500) {
                console.warn('LCP が遅延しています。広告の影響を確認してください。');
              }
            }
          }
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.error('パフォーマンス監視エラー:', error);
      }
    }
  }

  // デバッグ情報
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      adsLoaded: this.adsLoaded,
      publisherId: this.publisherId,
      isRestrictedPage: this.isRestrictedPage(),
      adElements: document.querySelectorAll('.adsbygoogle').length,
      scriptLoaded: this.isAdSenseScriptLoaded()
    };
  }

  // 利用可能かチェック
  isAvailable() {
    return this.isInitialized && this.isAdSenseScriptLoaded();
  }
}

// グローバルインスタンス
const adSenseManager = new AdSenseManager();
window.adSenseManager = adSenseManager;

// タブ変更の監視（既存のopenTab関数を拡張）
const originalOpenTab = window.openTab;
if (typeof originalOpenTab === 'function') {
  window.openTab = function(tabId) {
    const result = originalOpenTab.call(this, tabId);
    
    // AdSenseマネージャーにタブ変更を通知
    if (window.adSenseManager && window.adSenseManager.isAvailable()) {
      window.adSenseManager.onTabChange(tabId);
    }
    
    return result;
  };
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  // AdSenseスクリプトの読み込み待ち
  const checkAdSense = setInterval(async () => {
    if (typeof window.adsbygoogle !== 'undefined') {
      clearInterval(checkAdSense);
      
      // 初期化実行
      await adSenseManager.initialize();
      
      // パフォーマンス監視開始
      adSenseManager.monitorPerformance();
    }
  }, 100);
  
  // 10秒でタイムアウト
  setTimeout(() => {
    clearInterval(checkAdSense);
    console.warn('AdSenseスクリプトの読み込みがタイムアウトしました');
  }, 10000);
});

// Firebase認証状態変更時の処理
if (window.firebaseManager) {
  const originalOnUserLogin = window.firebaseManager.onUserLogin;
  const originalOnUserLogout = window.firebaseManager.onUserLogout;
  
  if (originalOnUserLogin) {
    window.firebaseManager.onUserLogin = async function(user) {
      const result = await originalOnUserLogin.call(this, user);
      
      // サブスクリプション状況に応じて広告制御
      if (window.adSenseManager && window.adSenseManager.isAvailable()) {
        setTimeout(() => {
          window.adSenseManager.onSubscriptionChange();
        }, 2000); // ログイン処理完了を待つ
      }
      
      return result;
    };
  }
  
  if (originalOnUserLogout) {
    window.firebaseManager.onUserLogout = function() {
      const result = originalOnUserLogout.call(this);
      
      // ログアウト時は広告を表示（無料ユーザー扱い）
      if (window.adSenseManager && window.adSenseManager.isAvailable()) {
        setTimeout(() => {
          window.adSenseManager.onSubscriptionChange();
        }, 1000);
      }
      
      return result;
    };
  }
}

// デバッグ用
window.adDebug = () => {
  console.log('AdSense Debug Info:', adSenseManager.getDebugInfo());
};