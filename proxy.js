// ======================================
// ICA API プロキシサーバー
// CORSエラーを回避するためのローカル中継サーバー
// 使い方: node proxy.js
// APIキーは .env ファイルで管理（GitHubには上げない）
// ======================================

import "dotenv/config";
import express from "express";
import fetch   from "node-fetch";

const app = express();
app.use(express.json());

const ICA_API_KEY  = process.env.ICA_API_KEY;
const ICA_ENDPOINT = process.env.ICA_ENDPOINT;

// ブラウザからのリクエストを許可（CORS設定）
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

// 静的ファイル配信（index.html など）
app.use(express.static("."));

// AIプロンプト生成エンドポイント（gpt-4oでCanvas描画パラメータを生成）
app.post("/proxy/generate-params", async (req, res) => {

    const { memories } = req.body;

    console.log("受信した memories:", memories);

    if (!memories || !Array.isArray(memories)) {
        return res.status(400).json({ error: "memories が配列ではありません" });
    }

    const systemPrompt = `あなたはアート生成AIです。
ユーザーの感情や記憶のキーワードを受け取り、抽象画の描画パラメータをJSON形式で返してください。
必ず以下のJSON形式のみを返してください（説明文は不要）:
{
  "background": "#rrggbb形式の背景色",
  "palette": ["#色1", "#色2", "#色3", "#色4", "#色5"],
  "emotion": {
    "calm": 0-100の数値,
    "joy": 0-100の数値,
    "nostalgia": 0-100の数値,
    "anxiety": 0-100の数値,
    "energy": 0-100の数値
  },
  "features": {
    "waves": true or false,
    "stars": true or false,
    "petals": true or false,
    "jagged": true or false
  },
  "title": "作品タイトル（日本語）",
  "reflection": "この作品についての詩的な解釈（2〜3文）"
}`;

    try {

        const response = await fetch(`${ICA_ENDPOINT}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${ICA_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user",   content: `キーワード: ${memories.join("、")}` }
                ]
            })
        });

        const data = await response.json();
        console.log("APIレスポンス:", JSON.stringify(data).slice(0, 500));
        const content = data.choices[0].message.content;

        // JSONだけ抽出
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON not found in response");

        const params = JSON.parse(jsonMatch[0]);
        res.json(params);

    } catch (err) {

        console.error("プロキシエラー:", err);
        res.status(500).json({ error: err.message });

    }

});

app.listen(3000, () => {
    console.log("✅ プロキシサーバー起動: http://localhost:3000");
    console.log("   ブラウザで http://localhost:3000 を開いてください");
});
