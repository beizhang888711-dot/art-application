// ======================================
// Artwork Generator — commands方式
// AIが描画命令を直接生成し、Canvasに実行する
// ======================================

const PROXY_ENDPOINT = "http://localhost:3000/proxy";

async function fetchAIParams(memories, conversationHistory) {
    const response = await fetch(`${PROXY_ENDPOINT}/generate-params`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories, conversationHistory })
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
// コマンド実行エンジン
// ======================================

function execCommand(cmd) {

    ctx.save();
    ctx.globalAlpha = cmd.alpha ?? 1;

    switch (cmd.type) {

        case "circle": {
            const x = cmd.x * W;
            const y = cmd.y * H;
            const r = cmd.r * Math.min(W, H);
            ctx.filter = cmd.blur ? `blur(${cmd.blur}px)` : "none";
            ctx.beginPath();
            ctx.fillStyle = cmd.color;
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case "curve": {
            ctx.beginPath();
            ctx.strokeStyle = cmd.color;
            ctx.lineWidth   = cmd.width ?? 2;
            ctx.moveTo(cmd.x1 * W, cmd.y1 * H);
            ctx.bezierCurveTo(
                cmd.cx1 * W, cmd.cy1 * H,
                cmd.cx2 * W, cmd.cy2 * H,
                cmd.x2  * W, cmd.y2  * H
            );
            ctx.stroke();
            break;
        }

        case "wave": {
            const baseY = cmd.y * H;
            const amp   = (cmd.amplitude ?? 0.04) * H;
            const freq  = cmd.frequency ?? 0.02;
            ctx.beginPath();
            ctx.strokeStyle = cmd.color;
            ctx.lineWidth   = cmd.width ?? 2;
            for (let x = 0; x <= W; x++) {
                const y = baseY + Math.sin(x * freq) * amp;
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
            break;
        }

        case "dots": {
            const count = cmd.count ?? 50;
            for (let i = 0; i < count; i++) {
                const r = rand(cmd.minR ?? 2, cmd.maxR ?? 8);
                ctx.beginPath();
                ctx.fillStyle = cmd.color;
                ctx.arc(rand(0, W), rand(0, H), r, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        case "ray": {
            const cx    = (cmd.cx ?? 0.5) * W;
            const cy    = (cmd.cy ?? 0.5) * H;
            const count = cmd.count ?? 12;
            ctx.strokeStyle = cmd.color;
            ctx.lineWidth   = cmd.width ?? 3;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * W, cy + Math.sin(angle) * W);
                ctx.stroke();
            }
            break;
        }

        case "spiral": {
            const cx = (cmd.cx ?? 0.5) * W;
            const cy = (cmd.cy ?? 0.5) * H;
            ctx.beginPath();
            ctx.strokeStyle = cmd.color;
            ctx.lineWidth   = cmd.width ?? 2;
            for (let t = 0; t < Math.PI * 10; t += 0.05) {
                const r = t * rand(4, 10);
                const x = cx + r * Math.cos(t);
                const y = cy + r * Math.sin(t);
                t < 0.05 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
            break;
        }

        case "rectangle": {
            if (cmd.blur) ctx.filter = `blur(${cmd.blur}px)`;
            ctx.fillStyle = cmd.color;
            ctx.fillRect(
                cmd.x      * W,
                cmd.y      * H,
                (cmd.width  ?? 1) * W,
                (cmd.height ?? 1) * H
            );
            break;
        }

        case "line": {
            ctx.beginPath();
            ctx.strokeStyle = cmd.color;
            ctx.lineWidth   = cmd.width ?? 2;
            ctx.moveTo(cmd.x1 * W, cmd.y1 * H);
            ctx.lineTo(cmd.x2 * W, cmd.y2 * H);
            ctx.stroke();
            break;
        }

        case "noise": {
            const count = cmd.count ?? 2000;
            for (let i = 0; i < count; i++) {
                ctx.fillStyle = cmd.color ?? "#000";
                ctx.fillRect(rand(0, W), rand(0, H), 1, 1);
            }
            break;
        }

    }

    ctx.restore();

}

// ======================================
// ローディング・AI呼び出し
// ======================================

const aiLoading = document.getElementById("aiLoading");

canvas.style.opacity   = "0";
canvas.style.transform = "scale(0.92)";

(async () => {

    try {

        const ai = await fetchAIParams(memories, conversationHistory);

        // 背景（放射グラデーション）
        const bgColor = ai.background ?? "#EEF5FF";
        const grad = ctx.createRadialGradient(W*0.5, H*0.4, 0, W*0.5, H*0.5, W*0.75);
        grad.addColorStop(0, lighten(bgColor, 30));
        grad.addColorStop(0.6, bgColor);
        grad.addColorStop(1, darken(bgColor, 30));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // 全コマンドを実行
        if (Array.isArray(ai.commands)) {
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
// ギャラリー保存
// ======================================

const saveGalleryBtn = document.getElementById("saveGalleryBtn");

if (saveGalleryBtn) {
    saveGalleryBtn.onclick = () => {
        const gallery = JSON.parse(localStorage.getItem("gallery")) || [];
        const image   = canvas.toDataURL("image/png");

        if (gallery.some(w => w.image === image)) {
            alert("この作品はすでに保存されています。");
            return;
        }

        gallery.push({
            title:      aiTitle,
            image:      image,
            reflection: aiReflection,
            keywords:   memories,
            createdAt:  new Date().toLocaleDateString("ja-JP")
        });

        localStorage.setItem("gallery", JSON.stringify(gallery));
        saveGalleryBtn.textContent = "✅ 保存済み";
        saveGalleryBtn.disabled    = true;
        alert("ギャラリーに保存しました！");
    };
}
