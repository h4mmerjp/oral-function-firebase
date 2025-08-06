// api/contact-simple.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, category, title, message } = req.body;

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

## 詳細内容
${message}

---
このIssueは[お問い合わせフォーム](https://oral-function-firebase.vercel.app/contact.html)から自動生成されました。`,
          labels: ["from-contact-form", category],
        }),
      }
    );

    if (issueResponse.ok) {
      const issue = await issueResponse.json();
      return res.status(200).json({
        success: true,
        message: "お問い合わせを受け付けました",
        issueNumber: issue.number,
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
