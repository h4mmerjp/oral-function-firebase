// お問い合わせフォーム処理API
// GitHub Actions経由でIssue自動作成

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'このエンドポイントはPOSTメソッドのみ対応しています' 
    });
  }

  try {
    // リクエストデータの検証
    const { name, email, category, title, message, browser } = req.body;
    
    // 必須フィールドの確認
    const requiredFields = { name, category, title, message };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: `必須項目が入力されていません: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // セキュリティバリデーション
    if (window?.securityUtils) {
      const allContent = Object.values(req.body).join(' ');
      const sensitiveCheck = window.securityUtils.detectSensitiveData(allContent);
      
      if (sensitiveCheck.hasSensitiveData && sensitiveCheck.riskLevel === 'high') {
        console.warn('High-risk content detected in contact form:', sensitiveCheck);
      }
    }

    // スパム検出（基本的な実装）
    const spamCheck = await detectSpam(req.body, req.headers);
    if (spamCheck.isSpam) {
      return res.status(429).json({
        error: 'Request blocked',
        message: 'スパムの可能性があるため送信がブロックされました',
        reason: spamCheck.reason
      });
    }

    // レート制限チェック
    const rateLimitCheck = await checkRateLimit(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    if (rateLimitCheck.exceeded) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: '送信頻度が高すぎます。しばらく時間をおいてから再度お試しください',
        retryAfter: rateLimitCheck.retryAfter
      });
    }

    // GitHub Actions トリガー用のペイロード準備
    const payload = {
      name: sanitizeInput(name),
      email: email ? sanitizeInput(email) : null,
      category: sanitizeInput(category),
      title: sanitizeInput(title),
      message: sanitizeInput(message),
      browser: browser ? sanitizeInput(browser) : null,
      metadata: {
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        referer: req.headers.referer,
        submissionId: generateSubmissionId()
      }
    };

    // GitHub Actions への repository_dispatch送信
    const githubResponse = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'oral-function-contact-api/1.0'
      },
      body: JSON.stringify({
        event_type: 'contact-form-submission',
        client_payload: payload
      })
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error('GitHub API Error:', githubResponse.status, errorText);
      
      return res.status(500).json({
        error: 'Failed to process submission',
        message: 'お問い合わせの処理中にエラーが発生しました。しばらく時間をおいてから再度お試しください。',
        submissionId: payload.metadata.submissionId
      });
    }

    // 成功レスポンス
    return res.status(200).json({
      success: true,
      message: 'お問い合わせを受け付けました',
      details: {
        submissionId: payload.metadata.submissionId,
        category: category,
        estimatedResponseTime: '24時間以内',
        nextSteps: [
          '技術サポートチームが内容を確認いたします',
          'カテゴリに応じて適切な担当者が対応いたします', 
          '必要に応じて追加情報をお伺いする場合があります'
        ]
      }
    });

  } catch (error) {
    console.error('Contact API Error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'サーバー内部エラーが発生しました。しばらく時間をおいてから再度お試しください。',
      timestamp: new Date().toISOString()
    });
  }
}

// スパム検出機能
async function detectSpam(formData, headers) {
  const spamIndicators = [];
  
  // 基本的なスパムパターン
  const spamPatterns = [
    /viagra|cialis|pharmacy/gi,
    /casino|poker|gambling/gi,
    /loan|money|cash|credit/gi,
    /http[s]?:\/\/[^\s]+/gi // URL含有
  ];

  const allText = Object.values(formData).join(' ').toLowerCase();
  
  spamPatterns.forEach((pattern, index) => {
    if (pattern.test(allText)) {
      spamIndicators.push(`pattern_${index}`);
    }
  });

  // 同一内容の繰り返し検出
  const words = allText.split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 20 && uniqueWords.size < words.length * 0.5) {
    spamIndicators.push('repetitive_content');
  }

  // User-Agent チェック
  const userAgent = headers['user-agent'];
  if (!userAgent || userAgent.length < 20) {
    spamIndicators.push('suspicious_user_agent');
  }

  return {
    isSpam: spamIndicators.length >= 2,
    reason: spamIndicators.join(', '),
    indicators: spamIndicators
  };
}

// レート制限チェック（簡易実装）
async function checkRateLimit(ip) {
  // 本番環境では Redis等の外部ストレージを使用
  // ここでは簡易的な実装
  const rateLimit = {
    windowMs: 15 * 60 * 1000, // 15分
    maxRequests: 5 // 15分で5回まで
  };

  // メモリ内レート制限（重要: 本番では永続化が必要）
  if (typeof global.rateLimitStore === 'undefined') {
    global.rateLimitStore = new Map();
  }

  const now = Date.now();
  const windowStart = now - rateLimit.windowMs;
  
  if (!global.rateLimitStore.has(ip)) {
    global.rateLimitStore.set(ip, []);
  }

  const requests = global.rateLimitStore.get(ip);
  
  // 古いリクエストを除去
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  global.rateLimitStore.set(ip, recentRequests);

  if (recentRequests.length >= rateLimit.maxRequests) {
    return {
      exceeded: true,
      retryAfter: Math.ceil((recentRequests[0] + rateLimit.windowMs - now) / 1000)
    };
  }

  // 新しいリクエストを記録
  recentRequests.push(now);
  global.rateLimitStore.set(ip, recentRequests);

  return { exceeded: false };
}

// 入力データのサニタイゼーション
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // 基本的なHTML文字を除去
    .substring(0, 1000); // 最大長制限
}

// 投稿ID生成
function generateSubmissionId() {
  return `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}