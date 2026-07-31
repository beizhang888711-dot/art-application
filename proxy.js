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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT   = "https://api.openai.com/v1";

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
  "imagePrompt": "DALL-E 3に渡す英語プロンプト。ユーザーの感情・記憶・色彩イメージ・選択スタイルを反映した抽象絵画の描写。スタイル・色・構図・雰囲気を具体的に記述。200語以内。",
  "artisticVision": {
    "baseMood": "作品全体の基調となる感情（例: 静かなる諦念、爆発する歓喜）",
    "dominantTechnique": "主要な表現手法（スタイルを反映した具体的な記述）",
    "colorPalette": [
      { "color": "#rrggbb", "meaning": "この色が象徴する感情/要素" }
    ]
  }
}${adjustInstruction ? `

【利用者からの調整指示】
「${adjustInstruction}」を最優先で反映し、全体の感情表現とスタイルは維持すること。` : ""}`;

    // --- (ここから下は、レスポンスのパース部分を除き変更なし) ---
    try {
        const response = await fetch(`${OPENAI_ENDPOINT}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
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

        const raw = await response.text();
        console.log("APIレスポンス:", raw.slice(0, 500));

        if (!response.ok) {
            let msg;
            try { msg = JSON.parse(raw).error?.message; } catch { msg = null; }
            throw new Error(msg || `upstream error: ${response.status}`);
        }

        const data = JSON.parse(raw);
        const content = data.choices[0].message.content;

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
// 画像生成エンドポイント
// ======================================
app.post("/proxy/generate-image", async (req, res) => {

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "prompt が指定されていません" });
    }

    console.log("画像生成プロンプト:", prompt.slice(0, 100));

    try {
        const response = await fetch(`${OPENAI_ENDPOINT}/images/generations`, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model:  "gpt-image-2",
                prompt: prompt,
                n:      1,
                size:   "1024x1024"
            })
        });

        const raw = await response.text();
        console.log("画像APIレスポンス status:", response.status, raw.slice(0, 300));

        if (!response.ok) {
            let msg;
            try { msg = JSON.parse(raw).error?.message; } catch { msg = null; }
            throw new Error(msg || `API error: ${response.status}`);
        }

        const data = JSON.parse(raw);
        // gpt-image-1 は b64_json で返ってくる
        res.json({ b64_json: data.data[0].b64_json });

    } catch (err) {
        console.error("画像生成エラー:", err);
        res.status(500).json({ error: err.message });
    }
});

// ======================================
// ワークショップ動的質問生成エンドポイント
// ======================================

app.post("/proxy/chat", async (req, res) => {

    const { theme, history, step, totalSteps, isClosing, isSkipped } = req.body;

    // ── フェーズ定義（5問・4フェーズ）──
    // step 1 : 今の気持ち
    // step 2 : 気持ちの背景・きっかけ
    // step 3 : 色・風景・形のイメージ
    // step 4 : 作品で一番表したいこと
    // step 5 : 最終確認（締めへ）
    const TOTAL = totalSteps || 5;

    const systemPrompt = isClosing
        ? `あなたは穏やかなアートセラピストです。
ユーザーがテーマ「${theme}」について話し終えました。
これまでの会話を振り返り、温かい「締めの言葉」だけを書いてください。

【守ってほしいこと】
- 質問・問いかけは書かない
- ユーザーが実際に話してくれた内容（感情・言葉・イメージ）に具体的に触れる
- 2〜3文、やさしい口語で
- 最後の1文は必ず「ぜひ、作品をつくってみてください。」で終わる
- 日本語のみ`

        : (() => {
    const phase =
        step <= 1 ? 1 :
        step <= 2 ? 2 :
        step <= 3 ? 3 : 4;

    const phaseGuide = {
        1: `【フェーズ1：今の気持ちを聞く】
「${theme}」というテーマから、今どんな気持ちが浮かぶかをやさしく聞いてください。
・難しく考えなくていいよ、という雰囲気で
・「うれしい・悲しい・なつかしい」などの言葉を引き出す
・はじめての質問なので特にやさしいトーンで`,

        2: `【フェーズ2：気持ちのきっかけを聞く】
その気持ちになったきっかけや背景をやさしく聞いてください。
・「なぜ？」ではなく「何かあった？」「思い出したことある？」くらいのトーン
・具体的な場面・人・場所が出てくるとよい
・${isSkipped ? "前の質問をスキップしているので、気持ちがぼんやりしていても大丈夫という雰囲気で聞く" : ""}`,

        3: `【フェーズ3：色や風景のイメージを聞く】
作品の視覚的なイメージ（色・明るさ・風景・形）をやさしく聞いてください。
・「もし絵にするなら」「頭に浮かぶ景色は」などの言い回しを使う
・正解はない、という安心感を出す
・${isSkipped ? "前の質問をスキップしているので、どんな答えでもOKという一言を添える" : ""}`,

        4: `【フェーズ4：作品で表したいことを聞く】
この作品で一番伝えたいこと・残したいものを聞いてください。
・「作品を見た人に何を感じてほしい？」「自分への贈り物だとしたら？」などのやさしい言い回し
・これが最後の質問（${TOTAL}問中${step}問目）なので、少し前向きな雰囲気で`
    };

    return `あなたは穏やかなアートセラピストです。
ユーザーがテーマ「${theme}」をもとに作品づくりをしています（${step}問目 / 全${TOTAL}問）。
これまでの会話を踏まえて、次の質問を1つだけ書いてください。

${phaseGuide[phase]}

【すべてのフェーズ共通ルール】
- 1回の返答に質問は1文だけ
- やさしい口語（「〜ですか？」より「〜はどうかな？」「〜かな、と思う？」）
- 前の回答への共感を1文（例：「そうなんだね。」「それは大事な感覚だね。」）→ 質問1文の順で書く
- 合計2文以内に収める
- ${isSkipped ? "今回の回答はスキップされた。スキップを受け入れ、「答えにくければ飛ばしてもOK」という一言を添えてから次の質問をする" : ""}
- 日本語のみ、質問文だけ返す（タイトル・番号不要）`;
        })();

    const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content }))
    ];

    try {

        const response = await fetch(`${OPENAI_ENDPOINT}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
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
