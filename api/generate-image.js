// ======================================
// Vercel Function: /api/generate-image
// DALL-E 3 画像生成エンドポイント
// ======================================

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    let body = req.body;
    if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body || typeof body !== "object") body = {};

    const { prompt } = body;

    if (!prompt) {
        return res.status(400).json({ error: "prompt が指定されていません" });
    }

    if (!process.env.ICA_ENDPOINT || !process.env.ICA_API_KEY) {
        return res.status(500).json({ error: "環境変数 ICA_ENDPOINT / ICA_API_KEY が未設定です" });
    }

    try {
        const response = await fetch(`${process.env.ICA_ENDPOINT}/images/generations`, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${process.env.ICA_API_KEY}`
            },
            body: JSON.stringify({
                model:           "dall-e-3",
                prompt:          prompt,
                n:               1,
                size:            "1024x1024",
                response_format: "b64_json"
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `API error: ${response.status}`);
        }

        // data.data[0] に b64_json が入っている
        res.status(200).json(data.data[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
