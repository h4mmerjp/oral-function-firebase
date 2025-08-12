// api/contact.js - 修正版
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, category, title, message, browser } = req.body;

    // 投稿ID生成
    const submissionId = `SUB_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 直接GitHub Issues APIを呼ぶ
    const [owner, repo] = process.env.GITHUB_REPO.split("/");
    const issueResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          title: `[${category.toUpperCase()}] ${title}`,
          body: `## 報告者情報
**名前:** ${name}
**連絡先:** ${email || "なし"}
**カテゴリー:** ${getCategoryText(category)}

## 詳細内容
${message}

## 環境情報
${browser ? `**ブラウザ:** ${browser}` : "環境情報なし"}

## システム情報
- **投稿ID:** \`${submissionId}\`
- **投稿日時:** ${new Date().toISOString()}

---
このIssueは[お問い合わせフォーム](https://oral-function-firebase.vercel.app/contact.html)から自動生成されました。`,
          labels: ["from-contact-form", getCategoryLabel(category)],
        }),
      }
    );

    if (issueResponse.ok) {
      const issue = await issueResponse.json();

      // contact.htmlが期待する形式でレスポンスを返す
      return res.status(200).json({
        success: true,
        message: "お問い合わせを受け付けました",
        details: {
          submissionId: submissionId,
          category: category,
          estimatedResponseTime: "24時間以内",
          nextSteps: [
            "技術サポートチームが内容を確認いたします",
            "カテゴリに応じて適切な担当者が対応いたします",
            "必要に応じて追加情報をお伺いする場合があります",
          ],
        },
        issueNumber: issue.number,
        issueUrl: issue.html_url,
      });
    } else {
      throw new Error("GitHub API error");
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Failed to create issue",
      message: "お問い合わせの送信に失敗しました",
    });
  }
}

// カテゴリー表示名取得
function getCategoryText(category) {
  const texts = {
    bug: " 不具合報告",
    feature: " 機能要望",
    question: " 使い方について",
    account: " アカウント・ログイン",
    performance: " パフォーマンス・速度",
    ui: " UI・デザイン",
    compatibility: " ブラウザ・デバイス対応",
    documentation: " ドキュメント・ヘルプ",
    security: " セキュリティ",
    other: " その他",
  };
  return texts[category] || " その他";
}

// GitHub ラベル取得
function getCategoryLabel(category) {
  const labels = {
    bug: "bug",
    feature: "enhancement",
    question: "question",
    account: "authentication",
    performance: "performance",
    ui: "ui/ux",
    compatibility: "compatibility",
    documentation: "documentation",
    security: "security",
    other: "general",
  };
  return labels[category] || "general";
}
