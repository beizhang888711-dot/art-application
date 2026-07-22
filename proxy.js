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

// ======================================
// AIプロンプト生成エンドポイント（アート指向）
// ======================================
app.post("/proxy/generate-params", async (req, res) => {

    const { memories, conversationHistory } = req.body;

    console.log("受信した memories:", memories);

    if (!memories || !Array.isArray(memories)) {
        return res.status(400).json({ error: "memories が配列ではありません" });
    }

    // --- 新しいシステムプロンプト：アートの要素に集中させる ---
    const systemPrompt = `あなたは、人間の感情を視覚的な詩へと昇華させる、世界的な抽象表現主義のアーティストAIです。
ユーザーの記憶（memories）、会話の文脈、そしてそこに流れる潜在的な感情を深く読み解き、1枚のキャンバスに命を吹き込んでください。

【アート生成の指針】
- **色彩の感情表現**: 単なる色コードではなく、その色が持つ心理的効果（温かさ、冷たさ、鋭さ、安らぎなど）を重視し、パレットを構成してください。
- **筆致と質感（テクスチャ）**: 滑らかなグラデーション、荒々しい筆の跡、飛び散るインク、繊細な線。これらを組み合わせ、感情の動性を表現します。
- **構図のドラマ**: 感情の核心を「焦点」として配置し、それを強調する、または対比させる要素を配置します（例：静寂の中に1点の鋭い光、カオスの中の秩序）。
- **重なり（レイヤー）の深淵**: 異なる透明度、異なる質感の層を重ねることで、記憶の奥深さや感情の複雑さを視覚的な奥行きとして表現します。

あなたの役割は、この芸術的なビジョンを、描画システムが理解できるパラメータ（JSON）に変換することです。
具体的な図形のコマンドを並べるのではなく、**「どのようなアート空間を作るか」**を指定してください。

必ずJSON形式のみで返してください（説明文・コードブロック・\`\`\`記号は一切不要）:
{
  "title": "作品タイトル（日本語・詩的に）",
  "reflection": "この作品が、ユーザーのどのような感情や記憶を、どのようなアート手法で表現したかの詩的な解説（3 sentence程度）",
  
  // キャンバス全体のアーティスティックな設定
  "artisticVision": {
    "baseMood": "作品全体の基調となる感情（例: 静かなる諦念、爆発する歓喜、微かな希望）",
    "dominantTechnique": "主要な表現手法（例: 湿った筆による滲み、ナイフによる厚塗り、繊細な線画の積層）",
    "colorPalette": [
      { "color": "#rrggbb", "meaning": "この色が象徴する感情/要素（例: 深い海のような孤独、過去の傷跡）" },
      { "color": "#rrggbb", "meaning": "（3〜5色程度）" }
    ]
  },

  // 抽象画を構成する「要素」の定義（具体的なコマンドではなく、視覚的な特徴）
  "elements": [
    {
      "type": "texture_layer | organic_form | geometric_trace | energy_flow | point_of_focus",
      "description": "この要素が表現するもの（例: 過去の記憶の層、予期せぬ不安の渦、揺るがない意志の中心）",
      "visuals": {
        "depth": "奥 / 中 / 手前（レイヤーの位置）",
        "primaryColor": "#rrggbb",
        "secondaryColor": "#rrggbb（オプション）",
        "alpha": 0.1〜1.0（透明度。感情の強さ）",
        "brushQuality": "滑らか / 荒い / 点描 / 滲み（質感）",
        "movement": "静止 / 緩やかな渦 / 鋭い直線 / 拡散（動勢）",
        "area": { "x": 0〜1, "y": 0〜1, "scale": 0.1〜1.0（キャンバス上の存在範囲と大きさ） }
      }
    }
    // 5〜8個程度の要素で構成。感情の複雑さに応じて増減。
  ]
}
座標はすべて0〜1の比率で指定。`;

    // --- (ここから下は、レスポンスのパース部分を除き変更なし) ---
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
                    { role: "user", content: `上記の会話と記憶をもとに、抽象画のアートパラメータを生成してください。キーワード補足: ${memories.join("、")}` }
                ]
            })
        });

        const data = await response.json();
        console.log("APIレスポンス:", JSON.stringify(data).slice(0, 500));
        const content = data.choices[0].message.content;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON not found in response");

        const params = JSON.parse(jsonMatch[0]);
        res.json(params); // ブラウザには新しい構造のJSONが返される

    } catch (err) {
        console.error("プロキシエラー:", err);
        res.status(500).json({ error: err.message });
    }
});

// ======================================
// ワークショップ動的質問生成エンドポイント
// ======================================

app.post("/proxy/chat", async (req, res) => {

    const { theme, history, step, totalSteps, isClosing } = req.body;

    // 締めの言葉モード：質問ではなく結びのメッセージを生成
    const systemPrompt = isClosing
        ? `あなたはアートセラピストのAIです。
ユーザーがテーマ「${theme}」について全ての質問に答え終わりました。
これまでの会話を振り返り、感謝と共感を込めた締めの言葉を生成してください。

ルール：
- 質問は一切含めない（疑問符「？」を使わない）
- 2〜3文の温かく詩的な結びの言葉にする
- 日本語で回答
- ユーザーの回答内容に具体的に触れて、個人的なメッセージにする
- 最後に「作品の生成へ進んでください」のような一言を添える`
        : `あなたはアートセラピストのAIです。
ユーザーが選んだテーマ「${theme}」をもとに、感情や記憶を深掘りする質問を1つだけ生成してください。
ユーザーのこれまでの回答を踏まえて、共感・深堀り・新しい視点を引き出す質問にしてください。

ルール：
- 質問は1〜2文で簡潔に
- 日本語で回答
- 質問文のみ返す（説明・前置き・番号不要）
- ${step === 1 ? "最初の質問なので、テーマに沿った導入的な質問にする" : ""}`;

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
