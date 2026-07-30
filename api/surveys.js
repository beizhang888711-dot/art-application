// ======================================
// Vercel Function: /api/surveys
// アンケート回答の保存・取得
// ======================================

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function supabaseHeaders() {
    return {
        "Content-Type":  "application/json",
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    };
}

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin",  "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: "環境変数 SUPABASE_URL / SUPABASE_ANON_KEY が未設定です" });
    }

    // ── POST: 回答を保存 ──
    if (req.method === "POST") {
        let body = req.body;
        if (typeof body === "string") {
            try { body = JSON.parse(body); } catch { body = {}; }
        }
        if (!body || typeof body !== "object") body = {};

        // 個人情報を含まないフィールドのみ受け取る
        const row = {
            artwork_id:        body.artworkId       || null,
            workshop_session:  body.workshopSession || null,
            score_expressed:   toScore(body.expressed),
            score_attachment:  toScore(body.attachment),
            score_involvement: toScore(body.involvement),
            score_ai_helped:   toScore(body.aiHelped),
            score_again:       toScore(body.again),
            emotion_before:    sanitize(body.emotionBefore),
            emotion_after:     sanitize(body.emotionAfter),
            free_text:         sanitize(body.freeText),
            answered_at:       body.savedAt || new Date().toISOString()
        };

        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/surveys`, {
                method:  "POST",
                headers: { ...supabaseHeaders(), "Prefer": "return=minimal" },
                body:    JSON.stringify(row)
            });
            if (!r.ok) {
                const err = await r.text();
                return res.status(r.status).json({ error: err });
            }
            return res.status(201).json({ ok: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // ── GET: 全件取得（管理画面用） ──
    if (req.method === "GET") {
        try {
            const r = await fetch(
                `${SUPABASE_URL}/rest/v1/surveys?select=*&order=answered_at.desc`,
                { headers: supabaseHeaders() }
            );
            if (!r.ok) {
                const err = await r.text();
                return res.status(r.status).json({ error: err });
            }
            const rows = await r.json();
            // フロントが期待するキー名に変換
            const surveys = rows.map(r => ({
                artworkId:       r.artwork_id,
                workshopSession: r.workshop_session,
                expressed:       r.score_expressed,
                attachment:      r.score_attachment,
                involvement:     r.score_involvement,
                aiHelped:        r.score_ai_helped,
                again:           r.score_again,
                emotionBefore:   r.emotion_before,
                emotionAfter:    r.emotion_after,
                freeText:        r.free_text,
                savedAt:         r.answered_at
            }));
            return res.status(200).json(surveys);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: "Method Not Allowed" });
};

// ── ユーティリティ ──

function toScore(val) {
    const n = Number(val);
    return (Number.isInteger(n) && n >= 1 && n <= 5) ? n : null;
}

function sanitize(str) {
    if (!str) return null;
    // 長さ制限（自由記述: 1000字、感情フィールド: 200字）
    return String(str).slice(0, 1000).trim() || null;
}
