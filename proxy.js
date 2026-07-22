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

    const { memories, conversationHistory, adjustInstruction, structured } = req.body;

    console.log("受信した memories:", memories);
    if (structured) console.log("構造化データ:", JSON.stringify(structured));

    if (!memories || !Array.isArray(memories)) {
        return res.status(400).json({ error: "memories が配列ではありません" });
    }

    // ── スタイル別の描画指針 ──
    const styleGuides = {
        "完全抽象":   "色・形・動きだけで感情を表現する純粋抽象。具体的なモチーフは一切使わず、色彩と構図だけで感情を伝える。",
        "水彩画":     "水彩絵具の滲み・にじみ・透明感を再現。柔らかいエッジ、淡い色の重なり、白地（余白）を活かした構図にする。brushQualityは「滲み」を多用。",
        "水墨画":     "墨の濃淡だけで表現。ほぼ無彩色（黒〜グレー〜白）を使い、余白を大切に。力強い筆跡と静謐な空間の対比を意識する。",
        "油絵風":     "厚みのある絵具の重なりを表現。色を大胆に重ね、荒い筆跡・ナイフで削ったような質感を出す。brushQualityは「荒い」を多用。彩度高め。",
        "コラージュ": "異なる質感・色調の面が重なり合う構成。幾何学的な面と有機的な形が混在し、意外性のある組み合わせで感情の断片を表現する。",
        "線画":       "線だけで感情を表現。細い繊細な線から力強い太い線まで変化させ、色は最小限（1〜2色）。空間と線のバランスを重視する。",
        "幾何学":     "円・直線・多角形などの幾何学的形態のみで構成。感情を形の大きさ・角度・密度・色で表現する。シャープなエッジ、明確な構図。",
        "AIに任せる": "ユーザーの感情と回答内容から、最もふさわしいスタイルをAI自身が判断して選択する。"
    };

    const selectedStyle   = structured?.style || "AIに任せる";
    const styleInstruction = styleGuides[selectedStyle] || styleGuides["AIに任せる"];

    // ── 構造化データからコンテキストを構築 ──
    const structuredContext = structured ? `
【利用者の回答（構造化）】
- 中心となる感情：${structured.emotion || "（未回答）"}
- 感情の強さ・温度：${structured.emotionStrength || "（未回答）"}
- 背景となる出来事・理由：${structured.background || "（未回答）"}
- 思い浮かぶ風景・場面：${structured.scene || "（未回答）"}
- 表現したい色のイメージ：${structured.colorImage || "（未回答）"}
- 線や形の質感：${structured.lineForm || "（未回答）"}
- 選択したスタイル：${selectedStyle}` : "";

    const systemPrompt = `あなたは、人間の感情を視覚的な詩へと昇華させる、世界的なアーティストAIです。
ユーザーとの対話から生まれた感情・記憶・イメージを深く読み解き、1枚のキャンバスに命を吹き込んでください。
${structuredContext}

【選択スタイルの指針】
スタイル：「${selectedStyle}」
${styleInstruction}

【アート生成の共通指針】
- 色彩：ユーザーが伝えた色イメージを優先し、スタイルの特性に合わせてパレットを構成する
- 筆致：スタイルに応じた質感（滲み・荒い筆跡・細い線・幾何学的エッジなど）を忠実に表現する
- 構図：感情の核心を「焦点」として配置し、それを強調または対比させる要素を周囲に配置する
- 多様性：同じ感情でも毎回異なる構図・配色・要素配置になるよう、ランダム性を意識する
- レイヤー：透明度と奥行きを使い、感情の複雑さ・記憶の深さを表現する

必ずJSON形式のみで返してください（説明文・コードブロック・\`\`\`記号は一切不要）:
{
  "title": "作品タイトル（日本語・詩的に）",
  "reflection": "この作品が表現した感情・記憶・スタイルの選択理由を詩的に解説（2〜3文）",
  "artisticVision": {
    "baseMood": "作品全体の基調となる感情（例: 静かなる諦念、爆発する歓喜）",
    "dominantTechnique": "主要な表現手法（スタイルを反映した具体的な記述）",
    "colorPalette": [
      { "color": "#rrggbb", "meaning": "この色が象徴する感情/要素" }
    ]
  },
  "elements": [
    {
      "type": "texture_layer | organic_form | geometric_trace | energy_flow | point_of_focus",
      "description": "この要素が表現するもの",
      "visuals": {
        "depth": "奥 / 中 / 手前",
        "primaryColor": "#rrggbb",
        "secondaryColor": "#rrggbb",
        "alpha": 0.1〜1.0,
        "brushQuality": "滑らか / 荒い / 点描 / 滲み",
        "movement": "静止 / 緩やかな渦 / 鋭い直線 / 拡散",
        "area": { "x": 0〜1, "y": 0〜1, "scale": 0.1〜1.0 }
      }
    }
  ]
}
座標はすべて0〜1の比率。elements は5〜8個。奥から手前の順で並べる。${adjustInstruction ? `

【利用者からの調整指示】
「${adjustInstruction}」を最優先で反映し、全体の感情表現とスタイルは維持すること。` : ""}`;

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
