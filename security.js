// セキュリティ強化モジュール
class SecurityUtils {
  constructor() {
    console.log("SecurityUtils initialized");
  }

  // HTML エスケープ関数 - XSS対策
  escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) {
      return '';
    }
    
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\//g, "&#x2F;");
  }

  // 患者データ入力検証
  validatePatientData(data) {
    const errors = [];
    const validations = {
      name: {
        pattern: /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]{1,50}$/,
        message: '患者名は日本語で1-50文字で入力してください'
      },
      patient_id: {
        pattern: /^[A-Z0-9\-]{1,20}$/,
        message: '患者IDは英数字とハイフンで1-20文字で入力してください'
      },
      name_kana: {
        pattern: /^[\u3040-\u309F\s]{0,50}$/,
        message: 'フリガナはひらがなで50文字以内で入力してください',
        required: false
      },
      birthdate: {
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        message: '生年月日はYYYY-MM-DD形式で入力してください',
        validator: (value) => {
          if (!value) return true;
          const date = new Date(value);
          const now = new Date();
          return date <= now && date.getFullYear() > 1900;
        },
        validatorMessage: '有効な生年月日を入力してください'
      },
      phone: {
        pattern: /^[\d\-\+\(\)\s]{10,15}$/,
        message: '電話番号は10-15桁で入力してください',
        required: false
      },
      address: {
        pattern: /^.{0,200}$/,
        message: '住所は200文字以内で入力してください',
        required: false
      }
    };

    for (const [field, validation] of Object.entries(validations)) {
      const value = data[field];
      
      // 必須チェック
      if (validation.required !== false && (!value || value.trim() === '')) {
        errors.push(`${this.getFieldDisplayName(field)}は必須項目です`);
        continue;
      }
      
      // 値がある場合のパターンチェック
      if (value && value.trim() !== '') {
        if (!validation.pattern.test(value)) {
          errors.push(validation.message);
        }
        
        // カスタムバリデーター
        if (validation.validator && !validation.validator(value)) {
          errors.push(validation.validatorMessage || validation.message);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // フィールド表示名の取得
  getFieldDisplayName(field) {
    const displayNames = {
      name: '患者名',
      patient_id: '患者ID',
      name_kana: 'フリガナ',
      birthdate: '生年月日',
      phone: '電話番号',
      address: '住所'
    };
    return displayNames[field] || field;
  }

  // 機密情報検出（GitHub Issue用）
  detectSensitiveData(content) {
    const sensitivePatterns = [
      {
        pattern: /\d{3}-?\d{4}-?\d{4}/g,
        type: '電話番号'
      },
      {
        pattern: /\b\d{3}-\d{4}\b/g,
        type: '郵便番号'
      },
      {
        pattern: /[^\s]+@[^\s]+\.[^\s]+/g,
        type: 'メールアドレス'
      },
      {
        pattern: /P\d{3,}/gi,
        type: '患者ID'
      },
      {
        pattern: /(田中|佐藤|鈴木|高橋|山田|渡辺|中村|小林|加藤|吉田|山本|山口|松本|池田|清水|斎藤|橋本|大田|鈴木|石川|中島|前田|林|藤田|岡田|長谷川|石井|近藤|後藤|坂本|遠藤|青木|藤井|西村|福田|太田|三浦|岡本|松田|中川|中野|原田|小川|中山|大野|水野|木村|野口|菊地|杉山|新井|宮崎|大塚|小野|島田|丸山|上田|高木|内田|森田|安田|和田|井上|森本|横山|平野|増田|小島|吉川|河野|武田|村上|金子|山崎|今井|藤原|平田|古川|伊藤|橋爪|本田|松井)/g,
        type: '日本人の一般的な姓'
      },
      {
        pattern: /(太郎|花子|次郎|三郎|四郎|五郎|六郎|七郎|八郎|九郎|十郎|一郎|二郎|健太|翔太|大輔|裕太|拓也|直樹|智也|雄大|美咲|由美|真由美|恵子|裕子|美穂|香織|愛美|さくら|ひかり|あやか)/g,
        type: '日本人の一般的な名前'
      }
    ];

    const detectedItems = [];
    const lowerContent = content.toLowerCase();

    for (const { pattern, type } of sensitivePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedItems.push({
          type: type,
          matches: matches,
          count: matches.length
        });
      }
    }

    return {
      hasSensitiveData: detectedItems.length > 0,
      detectedItems: detectedItems,
      riskLevel: this.calculateRiskLevel(detectedItems)
    };
  }

  // リスクレベル計算
  calculateRiskLevel(detectedItems) {
    if (detectedItems.length === 0) return 'safe';
    
    const highRiskTypes = ['電話番号', 'メールアドレス', '患者ID'];
    const hasHighRisk = detectedItems.some(item => highRiskTypes.includes(item.type));
    
    if (hasHighRisk) return 'high';
    if (detectedItems.length >= 3) return 'medium';
    return 'low';
  }

  // エラーメッセージの安全化
  sanitizeErrorMessage(error, isProduction = false) {
    if (isProduction) {
      // 本番環境では技術的な詳細を隠す
      const genericMessages = {
        'firebase': 'データベース接続エラーが発生しました',
        'auth': '認証エラーが発生しました',
        'permission': 'アクセス権限がありません',
        'network': 'ネットワークエラーが発生しました',
        'validation': '入力内容に問題があります'
      };
      
      const errorMessage = error.message || error.toString();
      
      for (const [key, message] of Object.entries(genericMessages)) {
        if (errorMessage.toLowerCase().includes(key)) {
          return message;
        }
      }
      
      return 'エラーが発生しました。しばらく待ってから再度お試しください。';
    }
    
    // 開発環境では詳細なエラーメッセージを表示
    return error.message || error.toString();
  }

  // Firebase認証トークン有効期限チェック
  async checkAuthTokenExpiry(user) {
    if (!user) return false;
    
    try {
      const tokenResult = await user.getIdTokenResult();
      const expirationTime = new Date(tokenResult.expirationTime);
      const now = new Date();
      
      // 5分以内に期限切れの場合はリフレッシュ
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      
      if (expirationTime <= fiveMinutesFromNow) {
        console.log('認証トークンをリフレッシュします');
        await user.getIdToken(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('認証トークンチェックエラー:', error);
      return false;
    }
  }

  // セッションタイムアウト管理
  initSessionTimeout(timeoutMinutes = 30) {
    let timeoutId;
    let lastActivity = Date.now();
    
    const resetTimeout = () => {
      lastActivity = Date.now();
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        if (window.firebaseManager && window.firebaseManager.getCurrentUser()) {
          console.log('セッションタイムアウト - 自動ログアウト');
          window.firebaseManager.signOut();
          alert('セッションがタイムアウトしました。再度ログインしてください。');
        }
      }, timeoutMinutes * 60 * 1000);
    };
    
    // ユーザーアクティビティを監視
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        if (Date.now() - lastActivity > 60000) { // 1分以上経過している場合のみリセット
          resetTimeout();
        }
      }, true);
    });
    
    // 初回タイムアウト設定
    resetTimeout();
  }

  // 監査ログ記録
  logUserAction(action, details = {}) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        userId: window.firebaseManager?.getCurrentUser()?.uid || 'anonymous',
        userAgent: navigator.userAgent,
        url: window.location.href,
        details: details
      };
      
      // 本番環境では外部ログサービスに送信
      console.log('Security Audit Log:', logEntry);
      
      // ローカルストレージにも保存（開発用）
      const logs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
      logs.push(logEntry);
      
      // 最新の100件のみ保持
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('security_audit_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('監査ログ記録エラー:', error);
    }
  }

  // CSP違反レポート処理
  handleCSPViolation(event) {
    console.warn('CSP Violation:', event);
    this.logUserAction('csp_violation', {
      blockedURI: event.blockedURI,
      documentURI: event.documentURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy
    });
  }

  // セキュリティヘッダー確認
  checkSecurityHeaders() {
    const expectedHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Content-Security-Policy'
    ];
    
    // 実際のヘッダーチェックは難しいため、設定推奨を表示
    console.log('セキュリティヘッダーの設定を確認してください:', expectedHeaders);
  }
}

// グローバルインスタンス作成
const securityUtils = new SecurityUtils();
window.securityUtils = securityUtils;

// CSP違反レポートリスナー設定
document.addEventListener('securitypolicyviolation', (event) => {
  securityUtils.handleCSPViolation(event);
});

// セッションタイムアウト初期化（30分）
document.addEventListener('DOMContentLoaded', () => {
  securityUtils.initSessionTimeout(30);
});

console.log('Security utilities loaded successfully');