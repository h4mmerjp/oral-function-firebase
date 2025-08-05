// api/contact.js - 修正版
export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

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
    // 環境変数チェック
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
      console.error('環境変数が設定されていません');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'サーバー設定エラーです。管理者に連絡してください。'
      });
    }

    const { name, email, category, title, message, browser } = req.body;
    
    // バリデーション
    if (!name || !category || !title || !message) {
      return res.status(400).json({
        error: 'Validation error',
        message: '必須項目を入力してください'
      });
    }

    // GitHub APIの正しいURL
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/dispatches`;

    console.log('GitHub API URL:', githubApiUrl);

    // repository_dispatchイベントを送信
    const githubResponse = await fetch(githubApiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'contact-form-submission',
        client_payload: {
          name: name.substring(0, 100),
          email: email || '',
          category: category,
          title: title.substring(0, 200),
          message: message.substring(0, 2000),
          browser: browser || '',
          metadata: {
            timestamp: new Date().toISOString(),
            submissionId: `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        }
      })
    });

    console.log('GitHub Response Status:', githubResponse.status);

    if (githubResponse.status === 204) {
      // 成功（204 No Content が正常なレスポンス）
      return res.status(200).json({
        success: true,
        message: 'お問い合わせを受け付けました',
        details: {
          submissionId: `SUB_${Date.now()}`,
          estimatedResponseTime: '24時間以内'
        }
      });
    } else {
      const errorData = await githubResponse.text();
      console.error('GitHub API Error:', errorData);
      
      return res.status(500).json({
        error: 'Submission failed',
        message: '送信に失敗しました。しばらく待ってから再度お試しください。'
      });
    }

  } catch (error) {
    console.error('Contact API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'サーバーエラーが発生しました'
    });
  }
}
