#!/bin/bash

# Gitブランチ名を取得
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "no-git")

# ccusageからモデル名と使用量を取得
CCUSAGE_JSON=$(ccusage statusline --json 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$CCUSAGE_JSON" ]; then
    # JSONから情報を抽出（jqがない場合はgrepとsedで代替）
    if command -v jq &> /dev/null; then
        MODEL=$(echo "$CCUSAGE_JSON" | jq -r '.model // "Unknown"')
        TOTAL_TOKENS=$(echo "$CCUSAGE_JSON" | jq -r '.totalTokens // 0')
        COST_CURRENT=$(echo "$CCUSAGE_JSON" | jq -r '.costs.current // 0')
    else
        # jqがない場合の代替手段
        MODEL=$(echo "$CCUSAGE_JSON" | grep -o '"model":"[^"]*"' | cut -d'"' -f4 || echo "Unknown")
        TOTAL_TOKENS=$(echo "$CCUSAGE_JSON" | grep -o '"totalTokens":[0-9]*' | cut -d':' -f2 || echo "0")
        COST_CURRENT=$(echo "$CCUSAGE_JSON" | grep -o '"current":[0-9.]*' | cut -d':' -f2 || echo "0")
    fi
else
    # ccusageが使えない場合のフォールバック
    MODEL="Claude"
    TOTAL_TOKENS="0"
    COST_CURRENT="0"
fi

# Claude 4の制限（概算）
# Opus 4: 200K context, Sonnet 4: 200K context
CONTEXT_LIMIT=200000

# 残トークン割合を計算
if [ "$TOTAL_TOKENS" -gt 0 ] && [ "$CONTEXT_LIMIT" -gt 0 ]; then
    USED_PERCENTAGE=$(echo "scale=1; $TOTAL_TOKENS * 100 / $CONTEXT_LIMIT" | bc 2>/dev/null || echo "0")
    REMAINING_PERCENTAGE=$(echo "scale=1; 100 - $USED_PERCENTAGE" | bc 2>/dev/null || echo "100")
else
    REMAINING_PERCENTAGE="100"
fi

# プログレスバーを作成（10文字幅）
PROGRESS_WIDTH=10
USED_BARS=$(echo "scale=0; $USED_PERCENTAGE * $PROGRESS_WIDTH / 100" | bc 2>/dev/null || echo "0")
REMAINING_BARS=$(echo "$PROGRESS_WIDTH - $USED_BARS" | bc 2>/dev/null || echo "$PROGRESS_WIDTH")

PROGRESS_BAR=""
for i in $(seq 1 $USED_BARS 2>/dev/null); do
    PROGRESS_BAR="${PROGRESS_BAR}█"
done
for i in $(seq 1 $REMAINING_BARS 2>/dev/null); do
    PROGRESS_BAR="${PROGRESS_BAR}░"
done

# ステータスラインを出力
echo "🌿 $GIT_BRANCH | 🤖 $MODEL | 🧠 $REMAINING_PERCENTAGE% [$PROGRESS_BAR] | 💰 \$$COST_CURRENT"