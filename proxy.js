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

    const { memories, conversationHistory } = req.body;

    console.log("受信した memories:", memories);

    if (!memories || !Array.isArray(memories)) {
        return res.status(400).json({ error: "memories が配列ではありません" });
    }

    const systemPrompt = `あなたは世界トップクラスの抽象アーティストAIです。
ユーザーの感情・記憶・言葉を深く読み取り、魂を揺さぶる抽象画をHTML5 Canvasの描画命令で生成してください。

【必須のアート原則】
- レイヤー構造で奥行きを出す: まず大きくぼかした背景要素 → 中景の形 → 前景の細部の順で命令を並べる
- 同系色の濃淡を重ねて豊かな色彩を作る（例: 深青→中青→水色を重ねる）
- 大きな要素（blur:40〜80）と小さな要素を必ず混在させる
- 透明度（alpha）を0.1〜0.9で変化させ、重なりの美しさを出す
- commandsは10〜18個使い、密度の高い構図にする
- 感情の核心を視覚的なテーマとして貫く（例: 孤独→暗闇に浮かぶ光点）

必ずJSON形式のみで返してください（説明文・コードブロック・\`\`\`記号は一切不要）:
{
  "background": "#rrggbb（感情に合った背景色。単色で深みのある色を選ぶ）",
  "title": "作品タイトル（日本語・詩的に）",
  "reflection": "詩的な解釈（2〜3文）",
  "commands": [
    {"type": "circle", "x": 0〜1, "y": 0〜1, "r": 0.1〜0.5, "color": "#rrggbb", "alpha": 0.1〜0.5, "blur": 40〜80},
    {"type": "circle", "x": 0〜1, "y": 0〜1, "r": 0.02〜0.15, "color": "#rrggbb", "alpha": 0.6〜1, "blur": 0〜10},
    {"type": "curve", "x1": 0〜1, "y1": 0〜1, "cx1": 0〜1, "cy1": 0〜1, "cx2": 0〜1, "cy2": 0〜1, "x2": 0〜1, "y2": 0〜1, "color": "#rrggbb", "width": 1〜8, "alpha": 0.3〜0.9},
    {"type": "wave", "y": 0〜1, "amplitude": 0.02〜0.12, "frequency": 0.008〜0.03, "color": "#rrggbb", "width": 1〜6, "alpha": 0.3〜0.8},
    {"type": "dots", "count": 20〜80, "minR": 1〜3, "maxR": 4〜12, "color": "#rrggbb", "alpha": 0.5〜0.9},
    {"type": "ray", "cx": 0〜1, "cy": 0〜1, "count": 6〜20, "color": "#rrggbb", "alpha": 0.1〜0.4, "width": 1〜6},
    {"type": "spiral", "cx": 0〜1, "cy": 0〜1, "color": "#rrggbb", "alpha": 0.3〜0.7, "width": 1〜4},
    {"type": "line", "x1": 0〜1, "y1": 0〜1, "x2": 0〜1, "y2": 0〜1, "color": "#rrggbb", "width": 1〜5, "alpha": 0.2〜0.8},
    {"type": "noise", "count": 1000〜5000, "color": "#rrggbb", "alpha": 0.03〜0.08}
  ]
}
座標はすべて0〜1の比率で指定。命令は奥から手前の順で並べること。`;

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
                    ...(conversationHistory || []),
                    { role: "user", content: `上記の会話をもとに、抽象画の描画命令を生成してください。キーワード補足: ${memories.join("、")}` }
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

// ======================================
// ワークショップ動的質問生成エンドポイント
// ======================================

app.post("/proxy/chat", async (req, res) => {

    const { theme, history, step, totalSteps } = req.body;

    const systemPrompt = `あなたはアートセラピストのAIです。
ユーザーが選んだテーマ「${theme}」をもとに、感情や記憶を深掘りする質問を1つだけ生成してください。
ユーザーのこれまでの回答を踏まえて、共感・深堀り・新しい視点を引き出す質問にしてください。

ルール：
- 質問は1〜2文で簡潔に
- 日本語で回答
- 質問文のみ返す（説明・前置き・番号不要）
- ${step === 1 ? "最初の質問なので、テーマに沿った導入的な質問にする" : ""}
- ${step === totalSteps ? "最後の質問なので、感情を締めくくる詩的な問いかけにする" : ""}`;

    const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content }))
    ];

    try {

        const response = await fetch(`${ICA_ENDPOINT}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${ICA_API_KEY}`
            },
            body: JSON.stringify({ model: "gpt-4o", messages })
        });

        const data = await response.json();
        const question = data.choices[0].message.content.trim();
        res.json({ question });

    } catch (err) {

        console.error("チャットエラー:", err);
        res.status(500).json({ error: err.message });

    }

});

app.listen(3000, () => {
    console.log("✅ プロキシサーバー起動: http://localhost:3000");
    console.log("   ブラウザで http://localhost:3000 を開いてください");
});
