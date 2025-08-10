// ヘルスチェックAPI - 認証不要の簡易エンドポイント
export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'このエンドポイントはGETメソッドのみ対応しています' 
    });
  }

  try {
    // 基本的な環境情報を返す
    const healthInfo = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        vercelRegion: process.env.VERCEL_REGION || 'unknown',
        hasGithubRepo: !!process.env.GITHUB_REPO,
        hasGithubToken: !!process.env.GITHUB_TOKEN
      },
      api: {
        contactEndpoint: '/api/contact',
        healthEndpoint: '/api/health'
      }
    };

    return res.status(200).json(healthInfo);

  } catch (error) {
    console.error('Health check error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'ヘルスチェックでエラーが発生しました',
      timestamp: new Date().toISOString()
    });
  }
}