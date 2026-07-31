// ======================================
// Vercel Function: /api/chat
// ワークショップ動的質問生成エンドポイント
// ======================================

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    // Vercel Functions はボディを自動パースしないので手動でパース
    let body = req.body;
    if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body || typeof body !== "object") body = {};

    const { theme, history, step, totalSteps, isClosing, isSkipped } = body;

    const OPENAI_ENDPOINT = "https://api.openai.com/v1";

    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "環境変数 OPENAI_API_KEY が未設定です" });
    }

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
        ...(history || []).map(h => ({ role: h.role, content: h.content }))
    ];

    try {
        const url = `${OPENAI_ENDPOINT}/chat/completions`;
        console.log("[chat] POST", url, "step:", step, "isClosing:", isClosing);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({ model: "gpt-4o", messages })
        });

        const raw = await response.text();
        console.log("[chat] status:", response.status, "body:", raw.slice(0, 300));

        if (!response.ok) {
            let msg;
            try { msg = JSON.parse(raw).error?.message; } catch { msg = null; }
            return res.status(response.status).json({
                error: msg || `upstream error: ${response.status}`,
                detail: raw.slice(0, 500)
            });
        }

        const data = JSON.parse(raw);
        const question = data.choices[0].message.content.trim();
        res.status(200).json({ question });

    } catch (err) {
        console.error("[chat] exception:", err.message);
        res.status(500).json({ error: err.message });
    }
};
