// ======================================
// Artwork Generator — artisticVision / elements方式
// AIが返す高レベルな要素定義をCanvasに変換して描画する
// ======================================

const PROXY_ENDPOINT = "/api";

async function fetchAIParams(memories, conversationHistory, adjustInstruction = null, structured = null) {
    const response = await fetch(`${PROXY_ENDPOINT}/generate-params`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories, conversationHistory, adjustInstruction, structured })
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
}

// ======================================
// Canvas
// ======================================

const canvas = document.getElementById("artCanvas");
const ctx    = canvas.getContext("2d");
const W      = canvas.width;
const H      = canvas.height;

// ======================================
// Workshopの回答取得
// ======================================

const memories             = JSON.parse(localStorage.getItem("reflectionData"))         || [];
const conversationHistory  = JSON.parse(localStorage.getItem("conversationHistory"))    || [];
const artworkStructured    = JSON.parse(localStorage.getItem("artworkStructured"))      || null;

// キーワード表示
const keywordContainer = document.getElementById("keywordContainer");
memories.forEach(word => {
    const tag = document.createElement("div");
    tag.className = "keyword";
    tag.textContent = word;
    keywordContainer.appendChild(tag);
});

// ======================================
// AIパラメータ（グローバル）
// ======================================

let aiTitle      = "Reflection";
let aiReflection = "あなたの言葉から生まれた、世界にひとつだけの作品です。";

// ======================================
// ユーティリティ
// ======================================

function rand(min, max) { return Math.random() * (max - min) + min; }

// 16進カラーを明るく/暗くする
function adjustColor(hex, amount) {
    const n = parseInt(hex.replace("#",""), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (n & 0xff) + amount));
    return `#${((r<<16)|(g<<8)|b).toString(16).padStart(6,"0")}`;
}
function lighten(hex, amount) { return adjustColor(hex,  amount); }
function darken (hex, amount) { return adjustColor(hex, -amount); }

// ======================================
// elements → Canvas 変換レンダラー
// ======================================

/**
 * element.visuals の brushQuality / movement / area などをもとに
 * 各要素タイプを Canvas に描画する
 */
function renderElement(el) {
    if (!el || !el.visuals) return;

    const v     = el.visuals;
    const alpha = typeof v.alpha === "number" ? v.alpha : 0.6;
    const color = v.primaryColor   ?? "#888888";
    const color2= v.secondaryColor ?? color;
    const ax    = typeof v.area?.x     === "number" ? v.area.x     : 0.5;
    const ay    = typeof v.area?.y     === "number" ? v.area.y     : 0.5;
    const scale = typeof v.area?.scale === "number" ? v.area.scale : 0.4;
    const cx    = ax * W;
    const cy    = ay * H;
    const size  = scale * Math.min(W, H);

    // brushQuality → blur量
    const blurMap = { "滑らか": 30, "滲み": 50, "荒い": 4, "点描": 0 };
    const blur = blurMap[v.brushQuality] ?? 10;

    // movement → 動きの係数
    const moveMap = { "静止": 0, "緩やかな渦": 1, "鋭い直線": 2, "拡散": 3 };
    const moveMode = moveMap[v.movement] ?? 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (blur > 0) ctx.filter = `blur(${blur}px)`;

    switch (el.type) {

        // 背景テクスチャ層：大きなぼかし円 + ノイズ
        case "texture_layer": {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
            grad.addColorStop(0,   color);
            grad.addColorStop(0.6, color2);
            grad.addColorStop(1,   "transparent");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // 軽いノイズ
            ctx.filter = "none";
            ctx.globalAlpha = alpha * 0.04;
            ctx.fillStyle = color;
            for (let i = 0; i < 1500; i++) {
                ctx.fillRect(rand(0, W), rand(0, H), 1, 1);
            }
            break;
        }

        // 有機的な形：不規則なベジェ曲線の塊
        case "organic_form": {
            ctx.beginPath();
            ctx.moveTo(cx + rand(-size*0.3, size*0.3), cy + rand(-size*0.3, size*0.3));
            for (let i = 0; i < 6; i++) {
                ctx.bezierCurveTo(
                    cx + rand(-size, size), cy + rand(-size, size),
                    cx + rand(-size, size), cy + rand(-size, size),
                    cx + rand(-size*0.5, size*0.5), cy + rand(-size*0.5, size*0.5)
                );
            }
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();

            if (color2 !== color) {
                ctx.globalAlpha = alpha * 0.5;
                ctx.filter = `blur(${blur * 1.5}px)`;
                ctx.fillStyle = color2;
                ctx.fill();
            }
            break;
        }

        // 幾何学的な痕跡：直線・折れ線・鋭い動き
        case "geometric_trace": {
            ctx.strokeStyle = color;
            ctx.lineWidth   = moveMode === 2 ? rand(2, 6) : rand(1, 3);
            ctx.filter = blur > 0 ? `blur(${Math.min(blur * 0.3, 4)}px)` : "none";

            const count = moveMode === 2 ? 8 : 5;
            for (let i = 0; i < count; i++) {
                ctx.beginPath();
                const sx = cx + rand(-size, size);
                const sy = cy + rand(-size, size);
                ctx.moveTo(sx, sy);
                if (moveMode === 2) {
                    // 鋭い直線
                    ctx.lineTo(cx + rand(-size*0.5, size*0.5), cy + rand(-size*0.5, size*0.5));
                } else {
                    // ベジェ
                    ctx.bezierCurveTo(
                        rand(0, W), rand(0, H),
                        rand(0, W), rand(0, H),
                        cx + rand(-size*0.5, size*0.5), cy + rand(-size*0.5, size*0.5)
                    );
                }
                ctx.strokeStyle = i % 2 === 0 ? color : color2;
                ctx.stroke();
            }
            break;
        }

        // エネルギーの流れ：渦・放射・波
        case "energy_flow": {
            ctx.strokeStyle = color;
            ctx.lineWidth   = rand(1, 4);

            if (moveMode === 1) {
                // 渦
                ctx.beginPath();
                for (let t = 0; t < Math.PI * 8; t += 0.05) {
                    const r = t * size / (Math.PI * 8);
                    const x = cx + r * Math.cos(t);
                    const y = cy + r * Math.sin(t);
                    t < 0.05 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            } else if (moveMode === 3) {
                // 拡散：放射状の波線
                const rayCount = 12;
                for (let i = 0; i < rayCount; i++) {
                    const angle = (Math.PI * 2 / rayCount) * i;
                    ctx.beginPath();
                    for (let r = 0; r <= size; r += 4) {
                        const wave = Math.sin(r * 0.05) * 8;
                        const x = cx + (r + wave) * Math.cos(angle);
                        const y = cy + (r + wave) * Math.sin(angle);
                        r === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = i % 2 === 0 ? color : color2;
                    ctx.stroke();
                }
            } else {
                // 波
                const baseY = cy;
                const amp   = size * 0.15;
                ctx.beginPath();
                for (let x = 0; x <= W; x++) {
                    const y = baseY + Math.sin(x * 0.015) * amp;
                    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            break;
        }

        // 焦点：鮮明な輝点・強調マーク
        case "point_of_focus": {
            ctx.filter = "none";
            // 外側のグロー
            ctx.globalAlpha = alpha * 0.3;
            ctx.filter = `blur(${size * 0.15}px)`;
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
            ctx.fill();

            // 中心の輝点
            ctx.filter = "none";
            ctx.globalAlpha = Math.min(alpha * 1.5, 1);
            ctx.beginPath();
            ctx.fillStyle = color2 !== color ? color2 : lighten(color, 60);
            ctx.arc(cx, cy, size * 0.06, 0, Math.PI * 2);
            ctx.fill();

            // 十字ハイライト
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = color2 !== color ? color2 : lighten(color, 40);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.25, cy);
            ctx.lineTo(cx + size * 0.25, cy);
            ctx.moveTo(cx, cy - size * 0.25);
            ctx.lineTo(cx, cy + size * 0.25);
            ctx.stroke();
            break;
        }

        // 未知タイプはランダムな円でフォールバック
        default: {
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
    }

    ctx.restore();
}

// ======================================
// ローディング・AI呼び出し
// ======================================

const aiLoading    = document.getElementById("aiLoading");
const aiLoadingMsg = document.getElementById("aiLoadingMsg");

// ── ローディングメッセージ演出 ──
const loadingMessages = [
    "あなたの言葉を色に変換しています",
    "感情の強さから線の表現を考えています",
    "作品の構図を組み立てています",
    "記憶の奥から色彩を引き出しています",
    "もうすぐ、あなただけの作品が完成します"
];
let loadingMsgTimer = null;

function startLoadingMessages() {
    let i = 0;
    if (aiLoadingMsg) aiLoadingMsg.textContent = loadingMessages[0];
    loadingMsgTimer = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        if (aiLoadingMsg) {
            aiLoadingMsg.style.opacity = "0";
            setTimeout(() => {
                aiLoadingMsg.textContent = loadingMessages[i];
                aiLoadingMsg.style.opacity = "1";
            }, 300);
        }
    }, 2500);
}

function stopLoadingMessages() {
    clearInterval(loadingMsgTimer);
}

canvas.style.opacity   = "0";
canvas.style.transform = "scale(0.92)";

(async () => {

    startLoadingMessages();

    try {

        const ai = await fetchAIParams(memories, conversationHistory, null, artworkStructured);

        // ─── 背景色の決定 ───
        // 新形式: artisticVision.colorPalette[0] を背景に使う
        // 旧形式フォールバック: ai.background
        let bgColor = "#0d0d1a";
        if (ai.artisticVision?.colorPalette?.length > 0) {
            bgColor = ai.artisticVision.colorPalette[0].color ?? bgColor;
        } else if (ai.background) {
            bgColor = ai.background;
        }

        const grad = ctx.createRadialGradient(W*0.5, H*0.4, 0, W*0.5, H*0.5, W*0.75);
        grad.addColorStop(0, lighten(bgColor, 20));
        grad.addColorStop(0.6, bgColor);
        grad.addColorStop(1, darken(bgColor, 20));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // ─── 要素の描画 ───
        // 新形式: elements 配列をレンダリング
        // 旧形式フォールバック: commands 配列
        if (Array.isArray(ai.elements) && ai.elements.length > 0) {
            // depth順（奥→手前）に並べ替え
            const depthOrder = { "奥": 0, "中": 1, "手前": 2 };
            const sorted = [...ai.elements].sort((a, b) => {
                const da = depthOrder[a.visuals?.depth] ?? 1;
                const db = depthOrder[b.visuals?.depth] ?? 1;
                return da - db;
            });
            sorted.forEach(el => renderElement(el));
        } else if (Array.isArray(ai.commands)) {
            // 旧形式フォールバック
            ai.commands.forEach(cmd => execCommand(cmd));
        }

        // タイトル・リフレクション
        if (ai.title) {
            aiTitle = ai.title;
            const el = document.getElementById("artTitle");
            if (el) el.textContent = ai.title;
        }
        if (ai.reflection) {
            aiReflection = ai.reflection;
            const el = document.getElementById("reflectionText");
            if (el) el.textContent = ai.reflection;
        }

        console.log("✅ AIパラメータ取得完了", ai);

    } catch (err) {

        console.warn("AIパラメータ取得失敗。デフォルト描画します。", err);

        // フォールバック：シンプルなグラデーション
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#EEF5FF");
        grad.addColorStop(1, "#ffffff");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

    } finally {

        stopLoadingMessages();
        aiLoading.style.display = "none";
        canvas.style.display    = "block";

        setTimeout(() => {
            canvas.style.transition = "1.8s";
            canvas.style.opacity    = "1";
            canvas.style.transform  = "scale(1)";
        }, 100);

        // キーワードアニメーション
        document.querySelectorAll(".keyword").forEach((tag, i) => {
            tag.style.opacity   = "0";
            tag.style.transform = "translateY(15px)";
            setTimeout(() => {
                tag.style.transition = ".5s";
                tag.style.opacity    = "1";
                tag.style.transform  = "translateY(0)";
            }, 300 + i * 120);
        });

        console.log("Artwork Complete");
    }

})();

// ======================================
// 調整パネル制御
// ======================================

const openAdjustBtn  = document.getElementById("openAdjustBtn");
const adjustPanel    = document.getElementById("adjustPanel");
const cancelAdjustBtn= document.getElementById("cancelAdjustBtn");
const applyAdjustBtn = document.getElementById("applyAdjustBtn");
const adjustInput    = document.getElementById("adjustInput");
const adjustChips    = document.getElementById("adjustChips");

// ── ボタンの有効/無効をリアルタイム更新 ──
function syncApplyBtn() {
    const hasChip = adjustChips.querySelector(".chip--selected") !== null;
    const hasFree = adjustInput.value.trim().length > 0;
    applyAdjustBtn.disabled = !(hasChip || hasFree);
}

// ── 再生成コア（チップ選択・自由入力Enterどちらからも呼ぶ） ──
async function runAdjust(instruction) {

    // パネルを閉じてリセット
    adjustPanel.style.display = "none";
    adjustChips.querySelectorAll(".chip--selected").forEach(c => c.classList.remove("chip--selected"));
    adjustInput.value = "";
    applyAdjustBtn.disabled = true;

    // Canvas リセット＆ローディング
    ctx.clearRect(0, 0, W, H);
    startLoadingMessages();
    aiLoading.style.display = "flex";
    canvas.style.display    = "block";
    canvas.style.opacity    = "0";
    canvas.style.transform  = "scale(0.92)";

    // 保存ボタンをリセット
    const saveBtn = document.getElementById("saveGalleryBtn");
    if (saveBtn) { saveBtn.textContent = "この作品を保存"; saveBtn.disabled = false; }

    try {
        const ai = await fetchAIParams(memories, conversationHistory, instruction, artworkStructured);

        // 背景
        let bgColor = "#0d0d1a";
        if (ai.artisticVision?.colorPalette?.length > 0) {
            bgColor = ai.artisticVision.colorPalette[0].color ?? bgColor;
        } else if (ai.background) {
            bgColor = ai.background;
        }
        const grad = ctx.createRadialGradient(W*0.5, H*0.4, 0, W*0.5, H*0.5, W*0.75);
        grad.addColorStop(0, lighten(bgColor, 20));
        grad.addColorStop(0.6, bgColor);
        grad.addColorStop(1, darken(bgColor, 20));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // 要素描画
        if (Array.isArray(ai.elements) && ai.elements.length > 0) {
            const depthOrder = { "奥": 0, "中": 1, "手前": 2 };
            const sorted = [...ai.elements].sort((a, b) =>
                (depthOrder[a.visuals?.depth] ?? 1) - (depthOrder[b.visuals?.depth] ?? 1)
            );
            sorted.forEach(el => renderElement(el));
        } else if (Array.isArray(ai.commands)) {
            ai.commands.forEach(cmd => execCommand(cmd));
        }

        // タイトル・リフレクション更新
        if (ai.title) {
            aiTitle = ai.title;
            const el = document.getElementById("artTitle");
            if (el) el.textContent = ai.title;
        }
        if (ai.reflection) {
            aiReflection = ai.reflection;
            const el = document.getElementById("reflectionText");
            if (el) el.textContent = ai.reflection;
        }

    } catch (err) {
        console.error("調整再生成失敗:", err);
        // フォールバック：グラデーション背景
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#1a1a2e");
        grad.addColorStop(1, "#16213e");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    } finally {
        stopLoadingMessages();
        aiLoading.style.display = "none";
        setTimeout(() => {
            canvas.style.transition = "1.2s";
            canvas.style.opacity    = "1";
            canvas.style.transform  = "scale(1)";
        }, 80);
    }
}

// ── チップをクリックしたら選択トグル → ボタン状態を更新 ──
adjustChips.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    chip.classList.toggle("chip--selected");
    syncApplyBtn();
});

// ── 自由入力を打つたびにボタン状態を更新、Enterで即実行 ──
adjustInput.addEventListener("input", syncApplyBtn);
adjustInput.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const free = adjustInput.value.trim();
    if (!free) return;
    const chips = [...adjustChips.querySelectorAll(".chip--selected")].map(c => c.dataset.value);
    runAdjust([...chips, free].join("、"));
});

// 「AIと一緒に仕上げる」→ パネルを開く
openAdjustBtn.addEventListener("click", () => {
    applyAdjustBtn.disabled = true; // 初期は無効
    adjustPanel.style.display = "flex";
    adjustPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

// キャンセル
cancelAdjustBtn.addEventListener("click", () => {
    adjustPanel.style.display = "none";
    adjustChips.querySelectorAll(".chip--selected").forEach(c => c.classList.remove("chip--selected"));
    adjustInput.value = "";
});

// 「この指示で作品を更新する」ボタン
applyAdjustBtn.addEventListener("click", () => {
    const chips = [...adjustChips.querySelectorAll(".chip--selected")].map(c => c.dataset.value);
    const free  = adjustInput.value.trim();
    const parts = [...chips, ...(free ? [free] : [])];
    if (parts.length === 0) return;
    runAdjust(parts.join("、"));
});

// ======================================
// ギャラリー保存 → 制作意図モーダル → アンケートモーダル
// ======================================

const saveGalleryBtn = document.getElementById("saveGalleryBtn");
const intentModal    = document.getElementById("intentModal");
const surveyModal    = document.getElementById("surveyModal");

// ── 実際にgalleryに保存する関数 ──
function doSave(intent) {
    const gallery = JSON.parse(localStorage.getItem("gallery")) || [];
    const image   = canvas.toDataURL("image/png");

    if (gallery.some(w => w.image === image)) {
        alert("この作品はすでに保存されています。");
        return;
    }

    gallery.push({
        title:      intent.title || aiTitle,
        image:      image,
        reflection: aiReflection,
        keywords:   memories,
        createdAt:  new Date().toLocaleDateString("ja-JP"),
        intent:     intent   // 制作意図データを一緒に保存
    });

    localStorage.setItem("gallery", JSON.stringify(gallery));
    saveGalleryBtn.textContent = "✅ 保存しました";
    saveGalleryBtn.disabled    = true;
}

// ── アンケートモーダルを開く ──
function openSurvey() {
    surveyModal.style.display = "flex";

    // スケールボタンのトグル
    surveyModal.querySelectorAll(".surveyQ").forEach(q => {
        q.querySelectorAll(".scale-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                q.querySelectorAll(".scale-btn").forEach(b => b.classList.remove("scale-btn--selected"));
                btn.classList.add("scale-btn--selected");
            });
        });
    });

    // 送信
    document.getElementById("surveySubmitBtn").onclick = () => {
        const answers = {};
        surveyModal.querySelectorAll(".surveyQ").forEach(q => {
            const key = q.dataset.key;
            const sel = q.querySelector(".scale-btn--selected");
            answers[key] = sel ? Number(sel.dataset.val) : null;
        });
        answers.freeText = document.getElementById("surveyFreeText").value.trim();
        answers.savedAt  = new Date().toISOString();

        const surveys = JSON.parse(localStorage.getItem("surveys")) || [];
        surveys.push(answers);
        localStorage.setItem("surveys", JSON.stringify(surveys));

        surveyModal.style.display = "none";
        alert("ご回答ありがとうございました。");
    };

    document.getElementById("surveySkipBtn").onclick = () => {
        surveyModal.style.display = "none";
    };
}

// ── 「この作品を保存」クリック → 制作意図モーダルを開く ──
if (saveGalleryBtn) {
    saveGalleryBtn.onclick = () => {
        intentModal.style.display = "flex";
    };
}

// ── 制作意図モーダル：「保存する」──
document.getElementById("intentSaveBtn").onclick = () => {
    const intent = {
        title:    document.getElementById("intentTitle").value.trim(),
        emotion:  document.getElementById("intentEmotion").value.trim(),
        focus:    document.getElementById("intentFocus").value.trim(),
        adopted:  document.getElementById("intentAdopted").value.trim(),
        changed:  document.getElementById("intentChanged").value.trim(),
        now:      document.getElementById("intentNow").value.trim()
    };
    intentModal.style.display = "none";
    doSave(intent);
    openSurvey();
};

// ── 制作意図モーダル：「スキップして保存」──
document.getElementById("intentSkipBtn").onclick = () => {
    intentModal.style.display = "none";
    doSave({ title: aiTitle });
    openSurvey();
};
