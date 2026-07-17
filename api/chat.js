// ======================================
// Vercel Function: /api/chat
// ワークショップ動的質問生成エンドポイント
// ======================================

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

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
        const response = await fetch(`${process.env.ICA_ENDPOINT}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${process.env.ICA_API_KEY}`
            },
            body: JSON.stringify({ model: "gpt-4o", messages })
        });

        const data = await response.json();
        const question = data.choices[0].message.content.trim();
        res.status(200).json({ question });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
