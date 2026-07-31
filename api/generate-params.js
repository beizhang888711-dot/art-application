// ======================================
// Vercel Function: /api/generate-params
// AIアートパラメータ生成エンドポイント
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

    const { memories, conversationHistory, adjustInstruction, structured } = body;

    console.log("[generate-params] memories:", memories);
    if (structured) console.log("[generate-params] structured:", JSON.stringify(structured));

    if (!memories || !Array.isArray(memories)) {
        return res.status(400).json({ error: "memories が配列ではありません" });
    }

    const ICA_ENDPOINT = process.env.ICA_ENDPOINT || "https://api.nextgen-beta.ica.ibm.com/ica/v1";

    if (!process.env.ICA_API_KEY) {
        return res.status(500).json({ error: "環境変数 ICA_API_KEY が未設定です" });
    }

    // ── スタイル別の描画指針 ──
    const styleGuides = {
        "完全抽象":   "色・形・動きだけで感情を表現する純粋抽象。具体的なモチーフは一切使わず、色彩と構図だけで感情を伝える。",
        "水彩画":     "水彩絵具の滲み・にじみ・透明感を再現。柔らかいエッジ、淡い色の重なり、白地（余白）を活かした構図にする。",
        "水墨画":     "墨の濃淡だけで表現。ほぼ無彩色（黒〜グレー〜白）を使い、余白を大切に。力強い筆跡と静謐な空間の対比を意識する。",
        "油絵風":     "厚みのある絵具の重なりを表現。色を大胆に重ね、荒い筆跡・ナイフで削ったような質感を出す。彩度高め。",
        "コラージュ": "異なる質感・色調の面が重なり合う構成。幾何学的な面と有機的な形が混在し、意外性のある組み合わせで感情の断片を表現する。",
        "線画":       "線だけで感情を表現。細い繊細な線から力強い太い線まで変化させ、色は最小限（1〜2色）。空間と線のバランスを重視する。",
        "幾何学":     "円・直線・多角形などの幾何学的形態のみで構成。感情を形の大きさ・角度・密度・色で表現する。シャープなエッジ、明確な構図。",
        "AIに任せる": "ユーザーの感情と回答内容から、最もふさわしいスタイルをAI自身が判断して選択する。"
    };

    const selectedStyle    = structured?.style || "AIに任せる";
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

    try {
        const url = `${ICA_ENDPOINT}/chat/completions`;
        console.log("[generate-params] POST", url);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${process.env.ICA_API_KEY}`
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
        console.log("[generate-params] status:", response.status, "body:", raw.slice(0, 500));

        if (!response.ok) {
            let msg;
            try { msg = JSON.parse(raw).error?.message; } catch { msg = null; }
            return res.status(response.status).json({
                error: msg || `upstream error: ${response.status}`,
                detail: raw.slice(0, 500)
            });
        }

        const data = JSON.parse(raw);
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON not found in response");

        res.status(200).json(JSON.parse(jsonMatch[0]));

    } catch (err) {
        console.error("[generate-params] exception:", err.message);
        res.status(500).json({ error: err.message });
    }
};
