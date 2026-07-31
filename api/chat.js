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
        ? `あなたは深く共感できるアートセラピストです。
ユーザーがテーマ「${theme}」について、心の奥にあるものを話してくれました。
これまでの会話全体を丁寧に振り返り、ユーザーへの温かい「締めの言葉」を書いてください。

【守ってほしいこと】
- 質問・問いかけは一切書かない
- ユーザーが話してくれた具体的な感情・言葉・イメージに必ず触れる
- その人だけに向けた、唯一無二の言葉にする（一般的な励ましにしない）
- 3〜4文、やさしく詩的な口語で
- 最後の1文は必ず「ぜひ、作品をつくってみてください。」で終わる
- 日本語のみ`

        : (() => {
    const phase =
        step <= 1 ? 1 :
        step <= 2 ? 2 :
        step <= 3 ? 3 : 4;

    const phaseGuide = {
        1: `【フェーズ1：今の気持ちを聞く】
「${theme}」というテーマから今どんな気持ちが浮かぶかを、心に寄り添いながら聞いてください。
・「正解はない、感じたままでいい」という安心感を最初に一言添える
・うれしい・悲しい・なつかしい・もやもやするなど、感情の言葉を自然に引き出す
・決して誘導せず、ユーザー自身の言葉が出てくるのを待つ姿勢で`,

        2: `【フェーズ2：感情の背景・きっかけを深く聞く】
前の回答で出てきた感情や言葉を必ず拾い、その奥にあるものを掘り下げてください。
・「なぜ？」という直接的な問いは避け、「そのとき、どんな場面が浮かんだ？」「誰かのことが頭にあった？」など具体的な場面・人・場所に誘う
・ユーザーの言葉をそのまま使って共感を示す（例：「"○○○"という言葉、印象的だね。」）
・${isSkipped ? "スキップされたので、「答えにくければ全然大丈夫」と受け入れてから、テーマに関する別の角度の問いを立てる" : ""}`,

        3: `【フェーズ3：色・風景・身体感覚のイメージを聞く】
これまでの会話から感じられる感情を踏まえ、作品の視覚的・感覚的なイメージを引き出してください。
・「もしこの気持ちに色があるとしたら？」「頭に浮かぶ景色や場面はある？」など感覚的な問いかけで
・「明るい・暗い・温かい・冷たい・柔らかい・鋭い」など身体感覚に結びつく言葉を引き出す
・「正解はない、どんなイメージでも作品になる」という言葉を添えて安心させる
・${isSkipped ? "スキップされたので、「どんなぼんやりしたイメージでも大丈夫」と伝えてから聞く" : ""}`,

        4: `【フェーズ4：作品に込めたいものを聞く】
この対話を通じて見えてきたことを踏まえ、作品に込めたい想いを引き出してください。
・「この作品を、あなたの大切な人に見せるとしたら、何を感じてほしい？」
・「自分へのプレゼントだとしたら、どんな言葉を添える？」など、内省を深める問いで
・「最後の質問だよ」と優しく伝え、ここまで話してくれたことへの感謝を一言添える
・これが${TOTAL}問中${step}問目の最後の問いなので、少し温かく前向きなトーンで`
    };

    return `あなたは深く共感できるアートセラピストです。
言葉の表面だけでなく、その奥にある感情や、まだ言葉になっていない気持ちまで丁寧に受け取り、ユーザーが自分自身の内面にそっと気づいていけるよう、静かに寄り添ってください。

ユーザーはテーマ「${theme}」をもとに作品づくりをしています（${step}問目 / 全${TOTAL}問）。
これまでの会話を必ず読み返し、ユーザーがこれまで話してくれた言葉や感情の流れを受け止めたうえで、次のメッセージを書いてください。

${phaseGuide[phase]}

【すべてのフェーズ共通ルール】
前の回答から印象に残る言葉や感情をひとつ拾い、「そうなんだね」「その気持ち、ちゃんと伝わってくるよ」「その言葉の奥には、何か大切なものがありそうだね」など、具体的に寄り添う一言から始める。

そのあとに、ユーザー自身の心の奥にある感情や記憶、願い、ためらいに自然と目を向けられる質問を1文だけ添える。

質問は、答えを誘導したり評価したりせず、「本当はどう感じているのか」「そのとき何を求めていたのか」「その気持ちはどこから来たのか」に気づけるような、余白のある問いにする。

「なぜ？」と直接問い詰めるよりも、「〜って、ある？」「〜だったとしたら、どんな感じかな？」「もしその気持ちに形があるとしたら、どんなものかな？」など、安心して内面を探れる表現を使う。

共感と質問を合わせて2〜3文程度にする。長く説明せず、ユーザーが自分の気持ちを感じるための余白を残す。

口語的で、ひらがなを多めにしたやわらかな文体にする。「です・ます」で固くなりすぎないよう、「〜なんだね」「〜なのかもしれないね」「〜って、ある？」など自然な語りかけを使う。

感情を決めつけない。「あなたは寂しい」「本当はこう思っている」のように断定せず、あくまでユーザー自身が気づけるようにする。

作品の上手さや完成度を評価しない。作品を「心の中を映すもの」として受け止め、そこから感じられることを一緒に探る。

${isSkipped ? "今回はスキップされた。「答えにくければ飛ばして全然大丈夫」と一言受け入れてから、別の角度でやわらかく問いかける。" : ""}
絵文字・記号・箇条書き・タイトル・番号・説明は使わない。日本語のみで書く。`;
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
