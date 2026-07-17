// ======================================
// Vercel Function: /api/generate-params
// AIアートパラメータ生成エンドポイント
// ======================================

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const { memories, conversationHistory } = req.body;

    if (!memories || !Array.isArray(memories)) {
        return res.status(400).json({ error: "memories が配列ではありません" });
    }

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
  "artisticVision": {
    "baseMood": "作品全体の基調となる感情（例: 静かなる諦念、爆発する歓喜、微かな希望）",
    "dominantTechnique": "主要な表現手法（例: 湿った筆による滲み、ナイフによる厚塗り、繊細な線画の積層）",
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
        "alpha": 0.5,
        "brushQuality": "滑らか / 荒い / 点描 / 滲み",
        "movement": "静止 / 緩やかな渦 / 鋭い直線 / 拡散",
        "area": { "x": 0.5, "y": 0.5, "scale": 0.5 }
      }
    }
  ]
}
座標はすべて0〜1の比率で指定。`;

    try {
        const response = await fetch(`${process.env.ICA_ENDPOINT}/chat/completions`, {
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
                    { role: "user", content: `上記の会話と記憶をもとに、抽象画のアートパラメータを生成してください。キーワード補足: ${memories.join("、")}` }
                ]
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON not found in response");

        res.status(200).json(JSON.parse(jsonMatch[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
