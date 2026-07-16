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

    const systemPrompt = `あなたは抽象アート生成AIです。
ユーザーの感情・記憶・言葉を深く読み取り、HTML5 Canvas APIの描画命令を生成してください。
感情・雰囲気・イメージを最大限に自由に表現してください。

必ずJSON形式のみで返してください（説明文・コードブロック・\`\`\`記号は一切不要）:
{
  "background": "#rrggbb（感情に合った背景色）",
  "title": "作品タイトル（日本語）",
  "reflection": "詩的な解釈（2〜3文）",
  "commands": [
    {"type": "circle", "x": 0〜1, "y": 0〜1, "r": 0〜0.5, "color": "#rrggbb", "alpha": 0〜1, "blur": 0〜80},
    {"type": "curve", "x1": 0〜1, "y1": 0〜1, "cx1": 0〜1, "cy1": 0〜1, "cx2": 0〜1, "cy2": 0〜1, "x2": 0〜1, "y2": 0〜1, "color": "#rrggbb", "width": 1〜10, "alpha": 0〜1},
    {"type": "wave", "y": 0〜1, "amplitude": 0.01〜0.15, "frequency": 0.005〜0.04, "color": "#rrggbb", "width": 1〜8, "alpha": 0〜1},
    {"type": "dots", "count": 1〜150, "minR": 1〜5, "maxR": 3〜20, "color": "#rrggbb", "alpha": 0〜1},
    {"type": "ray", "cx": 0〜1, "cy": 0〜1, "count": 4〜24, "color": "#rrggbb", "alpha": 0〜1, "width": 1〜10},
    {"type": "spiral", "cx": 0〜1, "cy": 0〜1, "color": "#rrggbb", "alpha": 0〜1, "width": 1〜6},
    {"type": "noise", "count": 0〜8000, "color": "#rrggbb", "alpha": 0〜0.15}
  ]
}
座標はすべて0〜1の比率で指定（例: x:0.5 = 画面中央）。commandsは6〜15個。感情を最大限に反映した自由な構図にすること。`;

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
