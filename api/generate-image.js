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

    const ICA_ENDPOINT = "https://api.openai.com/v1";

    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "環境変数 OPENAI_API_KEY が未設定です" });
    }

    try {
        const url = `${ICA_ENDPOINT}/images/generations`;
        console.log("[generate-image] POST", url);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model:           "dall-e-3",
                prompt:          prompt,
                n:               1,
                size:            "1024x1024",
                response_format: "b64_json"
            })
        });

        const raw = await response.text();
        console.log("[generate-image] status:", response.status, "body:", raw.slice(0, 300));

        if (!response.ok) {
            let msg;
            try { msg = JSON.parse(raw).error?.message; } catch { msg = null; }
            return res.status(response.status).json({
                error: msg || `upstream error: ${response.status}`,
                detail: raw.slice(0, 500)
            });
        }

        const data = JSON.parse(raw);
        // data.data[0] に b64_json が入っている
        res.status(200).json(data.data[0]);

    } catch (err) {
        console.error("[generate-image] exception:", err.message);
        res.status(500).json({ error: err.message });
    }
};
