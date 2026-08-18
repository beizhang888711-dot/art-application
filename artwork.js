const PROXY_ENDPOINT = "/proxy";

async function fetchGeneratedImage(prompt) {

    const response = await fetch(`${PROXY_ENDPOINT}/generate-image`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("[generate-image] error response:", data);
        throw new Error(data.error || `Image API error: ${response.status}`);
    }

    // gpt-image-2 は b64_json で返ってくる
    return `data:image/png;base64,${data.b64_json}`;
}

async function fetchAIParams(
    memories,
    conversationHistory,
    adjustInstruction = null,
    structured = null
) {

    const response = await fetch(`${PROXY_ENDPOINT}/generate-params`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            memories,
            conversationHistory,
            adjustInstruction,
            structured
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("[generate-params] error response:", data);
        throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
}
// ======================================
// 生成画像表示用 img 要素
// ======================================

const artImg = document.getElementById("artImg");

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

artImg.style.opacity   = "0";
artImg.style.transform = "scale(0.92)";

(async () => {

    startLoadingMessages();

    try {

        const ai = await fetchAIParams(
            memories,
            conversationHistory,
            null,
            artworkStructured
        );

        // ─── タイトル・リフレクション ───
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

        // ─── DALL-E 3 で画像生成 ───
        const imagePrompt = ai.imagePrompt || ai.title || "abstract emotional artwork";
        const url = await fetchGeneratedImage(imagePrompt);
        artImg.src = url;

        console.log("✅ 画像生成完了");

    } catch (err) {

        console.warn("画像生成失敗:", err);
        // フォールバック：プレースホルダー表示
        artImg.alt = "画像の生成に失敗しました。もう一度お試しください。";
        artImg.style.background = "linear-gradient(135deg, #EEF5FF, #ffffff)";

    } finally {

        stopLoadingMessages();
        aiLoading.style.display = "none";
        artImg.style.display    = "block";

        setTimeout(() => {
            artImg.style.transition = "1.8s";
            artImg.style.opacity    = "1";
            artImg.style.transform  = "scale(1)";
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
const adjustPreview     = document.getElementById("adjustPreview");
const adjustPreviewText = document.getElementById("adjustPreviewText");
const compareArea       = document.getElementById("compareArea");
const beforeImg         = document.getElementById("beforeImg");
const beforeImgSide     = document.getElementById("beforeImgSide");
const afterImg          = document.getElementById("afterImg");
const afterImgSide      = document.getElementById("afterImgSide");
const artSection        = document.getElementById("artSection");

// ── 指示プレビューを更新 ──
function updateAdjustPreview() {
    const chips = [...adjustChips.querySelectorAll(".chip--selected")].map(c => c.dataset.value);
    const free  = adjustInput.value.trim();
    const parts = [...chips, ...(free ? [free] : [])];
    const hasContent = parts.length > 0;
    applyAdjustBtn.disabled = !hasContent;
    if (hasContent) {
        adjustPreviewText.textContent = parts.join("、");
        adjustPreview.style.display   = "flex";
    } else {
        adjustPreview.style.display = "none";
    }
}

// ── トースト通知 ──
function showToast(message, type = "success") {
    const existing = document.getElementById("adjustToast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "adjustToast";
    toast.className = `adjustToast adjustToast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("adjustToast--visible"));
    setTimeout(() => {
        toast.classList.remove("adjustToast--visible");
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ── 再生成コア ──
async function runAdjust(instruction) {

    // before画像を保存
    const beforeDataUrl = artImg.src;

    // パネルを閉じてリセット
    adjustPanel.style.display = "none";
    adjustChips.querySelectorAll(".chip--selected").forEach(c => c.classList.remove("chip--selected"));
    adjustInput.value = "";
    adjustPreview.style.display = "none";
    applyAdjustBtn.disabled = true;

    // img位置までスクロール → ローディング開始
    artImg.scrollIntoView({ behavior: "smooth", block: "center" });

    startLoadingMessages();
    aiLoading.style.display = "flex";
    artImg.style.opacity    = "0";
    artImg.style.transform  = "scale(0.92)";

    // 保存ボタンをリセット
    const saveBtn = document.getElementById("saveGalleryBtn");
    if (saveBtn) { saveBtn.textContent = "この作品を保存"; saveBtn.disabled = false; }

    // 比較エリアをいったん隠す
    compareArea.style.display = "none";

    try {
        const ai = await fetchAIParams(memories, conversationHistory, instruction, artworkStructured);

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

        // ── DALL-E 3 で再生成 ──
        const imagePrompt = ai.imagePrompt || ai.title || "abstract emotional artwork";
        const url = await fetchGeneratedImage(imagePrompt);
        artImg.src = url;

        // ── before/after 比較表示 ──
        beforeImg.src     = beforeDataUrl;
        beforeImgSide.src = beforeDataUrl;

        // after img（タブ用・並べて用）にコピー
        afterImg.src     = artImg.src;
        afterImgSide.src = artImg.src;

        // 比較エリアを「変更後」タブで表示
        compareArea.style.display = "block";
        activateCompareTab("after");

        showToast("✅ 作品を更新しました");

    } catch (err) {
        console.error("調整再生成失敗:", err);
        showToast("⚠️ 更新に失敗しました。もう一度お試しください。", "error");
    } finally {
        stopLoadingMessages();
        aiLoading.style.display = "none";
        setTimeout(() => {
            artImg.style.transition = "1.2s";
            artImg.style.opacity    = "1";
            artImg.style.transform  = "scale(1)";
            artImg.classList.add("canvas--updated");
            setTimeout(() => artImg.classList.remove("canvas--updated"), 900);
            setTimeout(() => artSection.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
        }, 80);
    }
}

// ── 比較タブ切替 ──
function activateCompareTab(tab) {
    document.querySelectorAll(".compareTab").forEach(btn => {
        btn.classList.toggle("compareTab--active", btn.dataset.tab === tab);
    });
    document.getElementById("pane-after").style.display  = tab === "after" ? "block" : "none";
    document.getElementById("pane-before").style.display = tab === "before" ? "block" : "none";
    document.getElementById("pane-side").style.display   = tab === "side"   ? "flex"  : "none";
}

compareArea.addEventListener("click", e => {
    const btn = e.target.closest(".compareTab");
    if (!btn) return;
    activateCompareTab(btn.dataset.tab);
});

// ── チップをクリックしたら選択トグル → プレビュー更新 ──
adjustChips.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    chip.classList.toggle("chip--selected");
    updateAdjustPreview();
});

// ── 自由入力 → プレビュー更新、Enter で即実行 ──
adjustInput.addEventListener("input", updateAdjustPreview);
adjustInput.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const free = adjustInput.value.trim();
    if (!free) return;
    const chips = [...adjustChips.querySelectorAll(".chip--selected")].map(c => c.dataset.value);
    runAdjust([...chips, free].join("、"));
});

// 「🎨 作品をさらに仕上げる」→ パネルを開いてCanvas直下にスクロール
openAdjustBtn.addEventListener("click", () => {
    applyAdjustBtn.disabled = true;
    adjustPreview.style.display = "none";
    adjustPanel.style.display = "flex";
    // Canvas直下なので adjustPanel ではなく artSection を起点にスクロール
    adjustPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// キャンセル
cancelAdjustBtn.addEventListener("click", () => {
    adjustPanel.style.display = "none";
    adjustChips.querySelectorAll(".chip--selected").forEach(c => c.classList.remove("chip--selected"));
    adjustInput.value = "";
    adjustPreview.style.display = "none";
});

// 「この内容で作品を更新する」ボタン
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
const consentModal   = document.getElementById("consentModal");

// ── セッションIDを生成（ワークショップ単位）──
// localStorage に永続化し、artwork.html を開くたびに同じセッションを使う
function getOrCreateSessionId() {
    let sid = localStorage.getItem("workshopSessionId");
    if (!sid) {
        sid = "ws-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
        localStorage.setItem("workshopSessionId", sid);
    }
    return sid;
}

// ── 作品ごとの匿名ID（doSave時に生成して返す）──
function makeArtworkId() {
    return "art-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

let currentArtworkId  = null; // doSave で確定
const workshopSession = getOrCreateSessionId();

// ── ギャラリーの壊れたデータ（画像URLが base64/blob でないもの）を除去 ──
(function cleanupGallery() {
    const gallery = JSON.parse(localStorage.getItem("gallery")) || [];
    const cleaned = gallery.filter(w => w.image && (w.image.startsWith("data:") || w.image.startsWith("blob:")));
    if (cleaned.length !== gallery.length) {
        localStorage.setItem("gallery", JSON.stringify(cleaned));
    }
})();

// ── 実際にgalleryに保存する関数 ──
function doSave(intent) {
    const gallery = JSON.parse(localStorage.getItem("gallery")) || [];
    const image   = artImg.src;

    // base64 または blob URL でない場合は画像未生成
    if (!image || (!image.startsWith("data:") && !image.startsWith("blob:"))) {
        alert("作品の画像がまだ生成されていません。少し待ってから再度お試しください。");
        return;
    }

    if (gallery.some(w => w.image === image)) {
        alert("この作品はすでに保存されています。");
        return;
    }

    currentArtworkId = makeArtworkId();

    gallery.push({
        artworkId:      currentArtworkId,
        workshopSession: workshopSession,
        title:          intent.title || aiTitle,
        image:          image,
        reflection:     aiReflection,
        keywords:       memories,
        createdAt:      new Date().toLocaleDateString("ja-JP"),
        intent:         intent
    });

    localStorage.setItem("gallery", JSON.stringify(gallery));
    saveGalleryBtn.textContent = "✅ 保存しました";
    saveGalleryBtn.disabled    = true;

    // 保存後：「もう一作品」「発表を選ぶ」ボタンを表示
    const makeAnotherBtn = document.getElementById("makeAnotherBtn");
    const goShareBtn     = document.getElementById("goShareBtn");
    if (makeAnotherBtn) makeAnotherBtn.style.display = "inline-flex";
    if (goShareBtn)     goShareBtn.style.display     = "inline-flex";
}

// ── 「もう一作品つくる」── セッションIDを保持したまま workshop へ戻る
const makeAnotherBtn = document.getElementById("makeAnotherBtn");
if (makeAnotherBtn) {
    makeAnotherBtn.onclick = () => {
        // workshopSessionId はそのまま残す（同一セッションとして記録するため）
        // 会話・回答のみリセット
        localStorage.removeItem("reflectionData");
        localStorage.removeItem("conversationHistory");
        localStorage.removeItem("artworkStructured");
        window.location.href = "workshop.html";
    };
}

// ── 「SNSへ投稿」── Web Share API → フォールバック: X(Twitter)
const snsShareBtn = document.getElementById("snsShareBtn");
if (snsShareBtn) {
    snsShareBtn.onclick = async () => {
        const title = document.getElementById("artTitle")?.textContent?.trim() || "Generated Artwork";
        const shareText = `「${title}」AIとの対話から生まれた世界に一つの抽象作品です。 #AIアート #GeneratedArtwork`;
        const shareUrl = location.href;

        if (navigator.share) {
            try {
                await navigator.share({ title, text: shareText, url: shareUrl });
            } catch (e) {
                // ユーザーがキャンセルした場合は何もしない
            }
        } else {
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
            window.open(twitterUrl, "_blank", "noopener,noreferrer");
        }
    };
}



// ── 「発表する作品を選ぶ」── ギャラリーを発表モードで開く
const goShareBtn = document.getElementById("goShareBtn");
if (goShareBtn) {
    goShareBtn.onclick = () => {
        sessionStorage.setItem("galleryMode", "share");
        window.location.href = "gallery.html";
    };
}

// ── 同意モーダルを介してアンケートへ進む ──
/* TODO: アンケート機能 一時無効化
function openConsentThenSurvey() {
    consentModal.style.display = "flex";

    document.getElementById("consentAgreeBtn").onclick = () => {
        consentModal.style.display = "none";
        openSurvey();
    };

    document.getElementById("consentSkipBtn").onclick = () => {
        consentModal.style.display = "none";
    };
}

// ── アンケートモーダルを開く ──
function openSurvey() {
    surveyModal.style.display = "flex";

    // スケールボタンのトグル（重複登録防止のためonce相当でリセット）
    surveyModal.querySelectorAll(".surveyQ").forEach(q => {
        const newQ = q.cloneNode(true);
        q.parentNode.replaceChild(newQ, q);
    });
    surveyModal.querySelectorAll(".surveyQ").forEach(q => {
        q.querySelectorAll(".scale-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                q.querySelectorAll(".scale-btn").forEach(b => b.classList.remove("scale-btn--selected"));
                btn.classList.add("scale-btn--selected");
            });
        });
    });

    // 送信
    document.getElementById("surveySubmitBtn").onclick = async () => {
        const answers = {};
        surveyModal.querySelectorAll(".surveyQ").forEach(q => {
            const key = q.dataset.key;
            const sel = q.querySelector(".scale-btn--selected");
            answers[key] = sel ? Number(sel.dataset.val) : null;
        });
        answers.freeText        = document.getElementById("surveyFreeText").value.trim();
        answers.emotionBefore   = (document.getElementById("emotionBefore")?.value  || "").trim();
        answers.emotionAfter    = (document.getElementById("emotionAfter")?.value   || "").trim();
        answers.savedAt         = new Date().toISOString();
        answers.artworkId       = currentArtworkId  || null;
        answers.workshopSession = workshopSession;

        // ── localStorage（オフライン用バックアップ）──
        const localSurveys = JSON.parse(localStorage.getItem("surveys")) || [];
        localSurveys.push(answers);
        localStorage.setItem("surveys", JSON.stringify(localSurveys));

        // ── Supabase へ送信（非同期・失敗してもUIはブロックしない）──
        try {
            await fetch("/api/surveys", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(answers)
            });
        } catch (err) {
            console.warn("アンケートのサーバー送信に失敗しました（ローカルには保存済）:", err);
        }

        surveyModal.style.display = "none";
        showToast("ご回答ありがとうございました。");
    };

    document.getElementById("surveySkipBtn").onclick = () => {
        surveyModal.style.display = "none";
    };
}
*/
function openConsentThenSurvey() { /* 一時無効化 */ }

// ── 制作意図モーダルを閉じる（保存せず戻る）──
function closeIntentModal() {
    intentModal.style.display = "none";
}

// ── 「この作品を保存」クリック → 制作意図モーダルを開く ──
if (saveGalleryBtn) {
    saveGalleryBtn.onclick = () => {
        intentModal.style.display = "flex";
        // ブラウザ戻る操作用に履歴を積む
        history.pushState({ modal: "intent" }, "");
    };
}

// ── 制作意図モーダル：「×」ボタン ──
document.getElementById("intentCloseBtn").onclick = closeIntentModal;

// ── 制作意図モーダル：「作品に戻る」ボタン ──
document.getElementById("intentCancelBtn").onclick = closeIntentModal;

// ── 制作意図モーダル：背景クリックで閉じる ──
intentModal.addEventListener("click", e => {
    if (e.target === intentModal) closeIntentModal();
});

// ── Escキーで閉じる ──
document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        if (intentModal.style.display  === "flex") closeIntentModal();
        if (consentModal.style.display === "flex") consentModal.style.display = "none";
        if (surveyModal.style.display  === "flex") surveyModal.style.display  = "none";
    }
});

// ── ブラウザ戻るボタンでモーダルを閉じる ──
window.addEventListener("popstate", () => {
    if (intentModal.style.display === "flex") closeIntentModal();
});

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
    // openConsentThenSurvey(); // TODO: アンケート機能 一時無効化
};

// ── 制作意図モーダル：「スキップして保存」──
document.getElementById("intentSkipBtn").onclick = () => {
    intentModal.style.display = "none";
    doSave({ title: aiTitle });
    // openConsentThenSurvey(); // TODO: アンケート機能 一時無効化
};

// ======================================
// PDFレポートエクスポート
// ======================================

document.getElementById("exportPdfBtn").addEventListener("click", () => {

    // 印刷用ヘッダーを動的生成（会話履歴＋作品説明）
    const conversationHistory = JSON.parse(localStorage.getItem("conversationHistory")) || [];
    const now = new Date().toLocaleDateString("ja-JP", { year:"numeric", month:"long", day:"numeric" });

    // 既存の印刷用要素を削除してから再生成
    document.querySelectorAll(".pdf-report-header, .pdf-conversation").forEach(el => el.remove());

    // ── ヘッダー（作品情報）──
    const header = document.createElement("div");
    header.className = "pdf-report-header";
    header.innerHTML = `
        <strong style="font-size:18px;">${document.getElementById("artTitle").textContent}</strong><br>
        Bloom — AIとの共創作品レポート<br>
        生成日：${now}
    `;
    document.querySelector(".container").insertBefore(header, document.querySelector(".container").firstChild);

    // ── 会話ログ（2ページ目）──
    if (conversationHistory.length > 0) {
        const convSection = document.createElement("div");
        convSection.className = "pdf-conversation";
        let rows = conversationHistory.map(msg => {
            const who  = msg.role === "user" ? "あなた" : "AI";
            const style = msg.role === "user"
                ? "background:#f0f4ff;padding:10px 14px;border-radius:8px;margin-bottom:10px;"
                : "background:#f7f8fa;padding:10px 14px;border-radius:8px;margin-bottom:10px;";
            return `<div style="${style}"><strong>${who}：</strong>${msg.content}</div>`;
        }).join("");

        convSection.innerHTML = `
            <h2 style="font-size:16px;margin-bottom:16px;color:#1f2328;">AIとの対話ログ</h2>
            ${rows}
        `;
        document.querySelector(".container").appendChild(convSection);
    }

    // 印刷ダイアログを開く
    window.print();

    // 印刷後に追加要素を削除
    setTimeout(() => {
        document.querySelectorAll(".pdf-report-header, .pdf-conversation").forEach(el => el.remove());
    }, 1000);
});
