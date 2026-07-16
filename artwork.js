// ======================================
// Artwork Generator
// AI生成パラメータのみで描画
// ======================================

// ======================================
// IBM Consulting Advantage API（gpt-4o）
// APIキーはプロキシサーバー（proxy.js）側で管理
// ======================================

const PROXY_ENDPOINT = "http://localhost:3000/proxy";

async function fetchAIParams(memories) {
    const response = await fetch(`${PROXY_ENDPOINT}/generate-params`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories })
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

const memories = JSON.parse(localStorage.getItem("reflectionData")) || [];

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
let palette      = ["#6C8CFF","#9D7CFF","#8AE6CF","#FF9EB7","#FFF0A0"];
let bgColor      = "#EEF5FF";
let shapes       = {
    circles:   20,
    particles: 60,
    curves:    15,
    blur:      35,
    noise:     2000,
    waves:     false,
    stars:     false,
    petals:    false,
    jagged:    false,
    spirals:   false,
    rays:      false
};

// ======================================
// ユーティリティ
// ======================================

function rand(min, max) { return Math.random() * (max - min) + min; }
function pick()          { return palette[Math.floor(Math.random() * palette.length)]; }

// ======================================
// 描画関数
// ======================================

function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, "#ffffff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}

function drawGlassCircles() {
    ctx.save();
    ctx.filter = `blur(${shapes.blur}px)`;
    ctx.globalAlpha = 0.30;
    for (let i = 0; i < shapes.circles; i++) {
        ctx.beginPath();
        ctx.fillStyle = pick();
        ctx.arc(rand(0,W), rand(0,H), rand(60,160), 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

function drawCurves() {
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < shapes.curves; i++) {
        ctx.beginPath();
        ctx.strokeStyle = pick();
        ctx.lineWidth   = rand(1.5, 7);
        ctx.moveTo(rand(0,W), rand(0,H));
        ctx.bezierCurveTo(rand(0,W),rand(0,H), rand(0,W),rand(0,H), rand(0,W),rand(0,H));
        ctx.stroke();
    }
    ctx.restore();
}

function drawParticles() {
    ctx.save();
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < shapes.particles; i++) {
        ctx.beginPath();
        ctx.fillStyle = pick();
        ctx.arc(rand(0,W), rand(0,H), rand(2,16), 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

function drawNoise() {
    ctx.save();
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < shapes.noise; i++) {
        ctx.fillStyle = "#000";
        ctx.fillRect(rand(0,W), rand(0,H), 1, 1);
    }
    ctx.restore();
}

function drawWaves() {
    if (!shapes.waves) return;
    ctx.save();
    ctx.globalAlpha = 0.50;
    for (let wave = 0; wave < 4; wave++) {
        ctx.beginPath();
        ctx.strokeStyle = pick();
        ctx.lineWidth   = rand(2, 6);
        for (let x = 0; x < W; x++) {
            const y = H * (0.3 + wave * 0.12) + Math.sin(x * 0.018 + wave) * rand(15,35);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function drawStars() {
    if (!shapes.stars) return;
    ctx.save();
    ctx.globalAlpha = 0.90;
    for (let i = 0; i < 200; i++) {
        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.arc(rand(0,W), rand(0,H), rand(0.5, 2.5), 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

function drawPetals() {
    if (!shapes.petals) return;
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 80; i++) {
        ctx.save();
        ctx.translate(rand(0,W), rand(0,H));
        ctx.rotate(rand(0, Math.PI*2));
        ctx.fillStyle = pick();
        ctx.beginPath();
        ctx.ellipse(0, 0, rand(8,16), rand(4,8), 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawJagged() {
    if (!shapes.jagged) return;
    ctx.save();
    ctx.globalAlpha = 0.50;
    for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.strokeStyle = pick();
        ctx.lineWidth   = rand(1, 4);
        ctx.moveTo(rand(0,W), rand(0,H));
        for (let j = 0; j < 12; j++) {
            ctx.lineTo(rand(0,W), rand(0,H));
        }
        ctx.stroke();
    }
    ctx.restore();
}

function drawSpirals() {
    if (!shapes.spirals) return;
    ctx.save();
    ctx.globalAlpha = 0.40;
    for (let s = 0; s < 4; s++) {
        const cx = rand(0, W);
        const cy = rand(0, H);
        ctx.beginPath();
        ctx.strokeStyle = pick();
        ctx.lineWidth   = rand(1.5, 4);
        for (let t = 0; t < Math.PI * 10; t += 0.05) {
            const r = t * rand(4, 10);
            const x = cx + r * Math.cos(t);
            const y = cy + r * Math.sin(t);
            t < 0.05 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function drawRays() {
    if (!shapes.rays) return;
    ctx.save();
    ctx.globalAlpha = 0.30;
    const cx = W / 2 + rand(-100, 100);
    const cy = H / 2 + rand(-100, 100);
    const count = Math.floor(rand(12, 24));
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        ctx.beginPath();
        ctx.strokeStyle = pick();
        ctx.lineWidth   = rand(2, 8);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * W, cy + Math.sin(angle) * W);
        ctx.stroke();
    }
    ctx.restore();
}

// ======================================
// 全描画
// ======================================

function renderCanvas() {
    drawBackground();
    drawGlassCircles();
    drawRays();
    drawCurves();
    drawWaves();
    drawSpirals();
    drawStars();
    drawPetals();
    drawJagged();
    drawParticles();
    drawNoise();
}

// ======================================
// ローディング・AI呼び出し
// ======================================

const aiLoading  = document.getElementById("aiLoading");
const aiArtImage = document.getElementById("aiArtImage");

canvas.style.opacity   = "0";
canvas.style.transform = "scale(0.92)";

(async () => {

    try {

        const ai = await fetchAIParams(memories);

        // パレット・背景
        if (ai.palette?.length)  palette = ai.palette;
        if (ai.background)       bgColor = ai.background;

        // 描画形状（AIが全指定）
        if (ai.shapes) Object.assign(shapes, ai.shapes);

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

        console.warn("AIパラメータ取得失敗。デフォルトで描画します。", err);

    } finally {

        aiLoading.style.display = "none";
        canvas.style.display    = "block";

        renderCanvas();

        // フェードイン
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
            title:       aiTitle,
            image:       image,
            reflection:  aiReflection,
            keywords:    memories,
            createdAt:   new Date().toLocaleDateString("ja-JP")
        });

        localStorage.setItem("gallery", JSON.stringify(gallery));

        saveGalleryBtn.textContent = "✅ 保存済み";
        saveGalleryBtn.disabled    = true;
        alert("ギャラリーに保存しました！");

    };

}
