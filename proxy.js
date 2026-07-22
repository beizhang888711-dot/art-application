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

    const { memories, conversationHistory, adjustInstruction } = req.body;

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
座標はすべて0〜1の比率で指定。${adjustInstruction ? `

【利用者からの調整指示】
前回の作品に対して、次の変更を加えてください：「${adjustInstruction}」
この指示を最優先で反映しつつ、全体の感情表現は維持してください。` : ""}`;

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
                    { role: "user", content: adjustInstruction
                        ? `上記の会話と記憶をもとに、抽象画のアートパラメータを生成してください。キーワード補足: ${memories.join("、")}\n\n【調整指示】次の点を必ず反映してください：${adjustInstruction}`
                        : `上記の会話と記憶をもとに、抽象画のアートパラメータを生成してください。キーワード補足: ${memories.join("、")}` }
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
ユーザーがテーマ「${theme}」について全ての対話を終えました。
これまでの会話全体を振り返り、感謝と共感を込めた「締めの言葉」だけを生成してください。

【厳守ルール】
- これは締めの言葉です。質問・問いかけは絶対に含めない
- 「〜ですか？」「〜でしょうか？」「〜してみませんか？」など、疑問・誘導の表現は一切禁止
- 文末は「〜です。」「〜ます。」「〜でしょう。」など断定・詠嘆で終わること
- ユーザーが話してくれた内容（記憶・感情・言葉）に具体的に触れて、寄り添うメッセージにする
- 2〜3文、温かく詩的な文体で
- 日本語のみ
- 最後の1文は「ぜひ、作品の生成へ進んでください。」で締めること`
        : (() => {
    // step（1〜6）を3段階に振り分け
    // ステップ1〜2：感情を見つける
    // ステップ3〜4：背景を言葉にする
    // ステップ5〜6：表現を自分で決める
    const phase =
        step <= 2 ? 1 :
        step <= 4 ? 2 : 3;

    const phaseGuide = {
        1: `【フェーズ：感情を見つける】
今の気持ちや感情に焦点を当てる質問をしてください。
例の方向性：
- 今の気持ちに一番近い言葉は何か
- その気持ちの強さや温度感はどのくらいか`,

        2: `【フェーズ：背景を言葉にする】
その感情が生まれた理由・背景・具体的な場面を掘り下げる質問をしてください。
例の方向性：
- なぜ今その気持ちを感じているのか
- その感情に結びついた出来事・風景・人・場所はあるか`,

        3: `【フェーズ：表現を自分で決める】
作品に反映したい視覚的・感覚的なイメージを利用者自身に決めてもらう質問をしてください。
例の方向性：
- どんな色・明暗・温度感で表したいか
- 柔らかい線か力強い線か、どちらが近いか
- 作品の中で一番目立たせたいものは何か`
    };

    return `あなたはアートセラピストのAIです。
ユーザーがテーマ「${theme}」をもとに、対話を通じて一緒に作品を作っています。
これまでの回答を踏まえ、次の質問を1つだけ生成してください。

${phaseGuide[phase]}

【共通ルール】
- 質問は1文、口語でやさしく（「〜ですか？」より「〜はどうですか？」「〜かな、と思ったりしますか？」など）
- 前の回答への共感・受け止めを1文添えてから質問する（例：「そうなんですね。」「それは大切な感覚ですね。」）
- 合計2〜3文に収める
- 日本語のみ、質問文のみ返す（タイトル・番号・説明不要）
- ${step === 1 ? "最初の質問なので、テーマへの入り口となる柔らかい問いかけにする" : ""}`;
        })();

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
