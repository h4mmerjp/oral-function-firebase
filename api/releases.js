// リリース情報プロキシAPI
// GitHub直接アクセスを防止しつつリリース情報を提供

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
    // キャッシュヘッダー設定（30分キャッシュ）
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');

    // GitHub APIからリリース情報を取得
    const githubApiUrl = `https://api.github.com/repos/${process.env.GITHUB_REPO}/releases`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'oral-function-releases-api/1.0'
    };

    // GitHub トークンがある場合はレート制限を緩和
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(githubApiUrl, { headers });

    if (!response.ok) {
      console.error('GitHub API Error:', response.status, response.statusText);
      
      // GitHub APIエラー時のフォールバック
      return res.status(200).json(getDefaultReleaseInfo());
    }

    const releases = await response.json();
    
    // リリース情報を公開用にフィルタリング・変換
    const publicReleases = releases
      .slice(0, 10) // 最新10件まで
      .map(release => transformReleaseData(release))
      .filter(release => release.isVisible); // 非公開リリースを除外

    return res.status(200).json({
      success: true,
      releases: publicReleases,
      totalCount: publicReleases.length,
      lastUpdated: new Date().toISOString(),
      apiVersion: '2.0'
    });

  } catch (error) {
    console.error('Releases API Error:', error);
    
    // エラー時のフォールバック
    return res.status(200).json(getDefaultReleaseInfo());
  }
}

// リリースデータを公開用に変換
function transformReleaseData(release) {
  // リリースノート本文をユーザー向けにサニタイズ
  const sanitizedBody = sanitizeReleaseBody(release.body || '');
  
  // バージョンタイプを判定
  const versionType = determineVersionType(release.tag_name);
  
  // 公開対象かどうかを判定
  const isVisible = shouldShowRelease(release);

  return {
    id: release.id,
    tagName: release.tag_name,
    name: release.name || release.tag_name,
    version: extractVersionNumber(release.tag_name),
    versionType: versionType,
    body: sanitizedBody,
    summary: extractSummary(sanitizedBody),
    highlights: extractHighlights(sanitizedBody),
    publishedAt: release.published_at,
    isPrerelease: release.prerelease,
    isDraft: release.draft,
    isVisible: isVisible,
    // GitHub URLは含めない - 直接アクセスを防止
    changelogUrl: null,
    downloadCount: (release.assets || []).reduce((sum, asset) => sum + asset.download_count, 0),
    assetsCount: (release.assets || []).length,
    metadata: {
      createdAt: release.created_at,
      authorName: release.author ? release.author.login : 'システム',
      targetCommitish: release.target_commitish
    }
  };
}

// リリースノート本文のサニタイゼーション
function sanitizeReleaseBody(body) {
  if (!body) return '更新内容の詳細は準備中です。';

  let sanitized = body
    // GitHubの技術的な情報を除去
    .replace(/## Technical Details[\s\S]*?(?=##|$)/gi, '')
    .replace(/### Breaking Changes[\s\S]*?(?=###|$)/gi, '')
    .replace(/### Developer Notes[\s\S]*?(?=###|$)/gi, '')
    .replace(/### Internal Changes[\s\S]*?(?=###|$)/gi, '')
    
    // GitHubリンクを除去
    .replace(/https:\/\/github\.com\/[^\s)]+/g, '')
    .replace(/\[([^\]]+)\]\(https:\/\/github\.com\/[^)]+\)/g, '$1')
    
    // PRやIssue番号を除去
    .replace(/#\d+/g, '')
    .replace(/\(#\d+\)/g, '')
    
    // コミットハッシュを除去
    .replace(/[a-f0-9]{7,40}/g, '')
    
    // 空行を整理
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 長すぎる場合は切り詰め
  if (sanitized.length > 1500) {
    sanitized = sanitized.substring(0, 1500) + '...';
  }

  return sanitized || '更新内容をご確認ください。';
}

// バージョンタイプの判定
function determineVersionType(tagName) {
  if (!tagName) return 'unknown';
  
  if (tagName.includes('alpha') || tagName.includes('a')) return 'alpha';
  if (tagName.includes('beta') || tagName.includes('b')) return 'beta';
  if (tagName.includes('rc') || tagName.includes('pre')) return 'prerelease';
  if (tagName.match(/v?\d+\.\d+\.\d+$/)) return 'stable';
  if (tagName.match(/v?\d+\.\d+$/)) return 'minor';
  if (tagName.match(/v?\d+$/)) return 'major';
  
  return 'custom';
}

// バージョン番号抽出
function extractVersionNumber(tagName) {
  if (!tagName) return null;
  
  const versionMatch = tagName.match(/v?(\d+(?:\.\d+)*(?:[.-][a-zA-Z0-9]+)*)/);
  return versionMatch ? versionMatch[1] : tagName;
}

// サマリー抽出（最初の段落）
function extractSummary(body) {
  if (!body) return '';
  
  const firstParagraph = body.split('\n\n')[0];
  return firstParagraph.replace(/^#+\s*/, '').trim().substring(0, 200);
}

// ハイライト抽出
function extractHighlights(body) {
  if (!body) return [];
  
  const highlights = [];
  
  // ハイライトセクションを検索
  const highlightSections = [
    /## (?:New Features?|新機能|追加機能)[\s\S]*?(?=##|$)/gi,
    /## (?:Improvements?|改善|改良)[\s\S]*?(?=##|$)/gi,
    /## (?:Bug ?Fixes?|バグ修正|修正)[\s\S]*?(?=##|$)/gi
  ];

  highlightSections.forEach(pattern => {
    const matches = body.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const items = match
          .split('\n')
          .filter(line => line.trim().startsWith('- ') || line.trim().startsWith('* '))
          .map(line => line.replace(/^[\s\-\*]+/, '').trim())
          .slice(0, 3); // 最大3項目

        highlights.push(...items);
      });
    }
  });

  return highlights.slice(0, 5); // 最大5項目
}

// リリース公開判定
function shouldShowRelease(release) {
  // ドラフトは非表示
  if (release.draft) return false;
  
  // 内部用タグは非表示
  const internalTags = ['internal', 'hotfix', 'test', 'dev'];
  if (internalTags.some(tag => (release.tag_name || '').toLowerCase().includes(tag))) {
    return false;
  }

  // プレリリースは表示するが注記
  return true;
}

// デフォルトのリリース情報（フォールバック）
function getDefaultReleaseInfo() {
  return {
    success: true,
    releases: [
      {
        id: 'default',
        tagName: 'v2.0.0',
        name: '口腔機能低下症診断システム v2.0',
        version: '2.0.0',
        versionType: 'stable',
        body: `## 主な機能

- 口腔機能評価の診断支援
- 患者データ管理システム
- セキュリティ強化機能

詳細な更新情報は準備中です。`,
        summary: '口腔機能評価システムの安定版リリース',
        highlights: [
          '口腔機能評価の診断支援機能',
          '患者データ管理システム',
          'セキュリティ機能の強化'
        ],
        publishedAt: new Date().toISOString(),
        isPrerelease: false,
        isDraft: false,
        isVisible: true,
        changelogUrl: null,
        downloadCount: 0,
        assetsCount: 0,
        metadata: {
          createdAt: new Date().toISOString(),
          authorName: 'システム',
          targetCommitish: 'main'
        }
      }
    ],
    totalCount: 1,
    lastUpdated: new Date().toISOString(),
    apiVersion: '2.0',
    isDefault: true,
    message: 'GitHub API接続時にフォールバック情報を表示しています'
  };
}