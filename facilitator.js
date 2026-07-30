// ======================================
// facilitator.js
// ======================================

// ──────────────────────────────────────
// タイムライン定義
// 各エントリは「開始からの経過秒」でトリガー
// ──────────────────────────────────────

const TIMELINE = [
    {
        atSec:   0,
        tag: "cheer",
        tagLabel: "声かけ",
        text: "制作スタートです。今の気持ちをそのまま入力してみてください。正解はありません。"
    },
    {
        atSec:  60,
        tag: "tip",
        tagLabel: "ヒント",
        text: "答えにくい質問は「この質問をスキップ」で飛ばせます。全部答えなくても作品は作れます。"
    },
    {
        atSec: 180,
        tag: "tip",
        tagLabel: "ヒント",
        text: "「よく分からない」ボタンを押すと、AIがやさしい言葉で質問を言い換えてくれます。"
    },
    {
        atSec: 300,
        tag: "time",
        tagLabel: "残り時間",
        text: "残り時間を確認してください。まだ全部の質問が終わっていなくても大丈夫です。"
    },
    {
        atSec: 420,
        tag: "cheer",
        tagLabel: "声かけ",
        text: "作品が生成されたら、色や雰囲気を変えることもできます。「作品をさらに仕上げる」を試してみてください。"
    },
    {
        atSec: 540,
        tag: "cheer",
        tagLabel: "声かけ",
        text: "想像と違う仕上がりになってもOKです。その「違い」が発表のネタになります。"
    },
    {
        atSec: 660,
        tag: "tip",
        tagLabel: "ヒント",
        text: "時間があれば「＋ もう一作品つくる」で2作目が作れます。複数作ってから選ぶのがおすすめです。"
    },
    {
        atSec: 780,
        tag: "time",
        tagLabel: "残り時間",
        text: "そろそろ作品を保存しておきましょう。「この作品を保存」→ スキップでも保存できます。"
    },
    {
        atSec: 900,
        tag: "time",
        tagLabel: "残り時間",
        text: "残り5分ほどです。保存が終わったら「発表する作品を選ぶ」からお気に入りを選んでください。"
    },
    {
        atSec: 1080,
        tag: "time",
        tagLabel: "残り時間",
        text: "まもなく終了です。発表したい作品とテーマを選んでおいてください。"
    }
];

// ──────────────────────────────────────
// 状態
// ──────────────────────────────────────

let totalSec   = 15 * 60; // デフォルト15分
let elapsed    = 0;
let running    = false;
let ticker     = null;
let firedSet   = new Set(); // 発火済みイベントのインデックス

// ──────────────────────────────────────
// DOM
// ──────────────────────────────────────

const timerDisplay = document.getElementById("timerDisplay");
const startBtn     = document.getElementById("startBtn");
const pauseBtn     = document.getElementById("pauseBtn");
const resetBtn     = document.getElementById("resetBtn");
const timelineEl   = document.getElementById("timeline");
const hintToast    = document.getElementById("hintToast");

// ──────────────────────────────────────
// タイマー表示
// ──────────────────────────────────────

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function updateDisplay() {
    const remaining = Math.max(totalSec - elapsed, 0);
    timerDisplay.textContent = formatTime(remaining);
    timerDisplay.className = "timerDisplay" +
        (remaining <= 0   ? " over" :
         remaining <= 180 ? " warn" : "");
}

// ──────────────────────────────────────
// タイムライン描画
// ──────────────────────────────────────

function buildTimeline() {
    timelineEl.innerHTML = "";
    TIMELINE.forEach((item, i) => {
        const div = document.createElement("div");
        div.className = "timelineItem";
        div.id = `tl-${i}`;
        div.innerHTML = `
            <span class="timelineItem__time">${formatTime(item.atSec)}</span>
            <span class="timelineItem__text">
                <span class="timelineItem__tag tag--${item.tag}">${item.tagLabel}</span>${item.text}
            </span>
        `;
        timelineEl.appendChild(div);
    });
}

function updateTimeline() {
    TIMELINE.forEach((item, i) => {
        const el = document.getElementById(`tl-${i}`);
        if (!el) return;
        if (elapsed >= item.atSec && (i === TIMELINE.length - 1 || elapsed < TIMELINE[i + 1].atSec)) {
            el.className = "timelineItem active";
        } else if (elapsed > item.atSec) {
            el.className = "timelineItem done";
        } else {
            el.className = "timelineItem";
        }
    });
}

// ──────────────────────────────────────
// ヒントトースト
// ──────────────────────────────────────

let toastTimer = null;
function showHint(text) {
    hintToast.textContent = text;
    hintToast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hintToast.classList.remove("show"), 5000);
}

// ──────────────────────────────────────
// タイマーの tick
// ──────────────────────────────────────

function tick() {
    if (!running) return;
    elapsed++;
    updateDisplay();
    updateTimeline();

    // タイムラインイベントの発火チェック
    TIMELINE.forEach((item, i) => {
        if (!firedSet.has(i) && elapsed >= item.atSec) {
            firedSet.add(i);
            showHint(item.text);
        }
    });

    if (elapsed >= totalSec) {
        running = false;
        clearInterval(ticker);
        startBtn.style.display = "inline-block";
        pauseBtn.style.display = "none";
        showHint("制作時間が終了しました。発表の準備をしてください。");
    }
}

// ──────────────────────────────────────
// ボタン操作
// ──────────────────────────────────────

startBtn.addEventListener("click", () => {
    running = true;
    ticker  = setInterval(tick, 1000);
    startBtn.style.display = "none";
    pauseBtn.style.display = "inline-block";
});

pauseBtn.addEventListener("click", () => {
    running = false;
    clearInterval(ticker);
    startBtn.style.display = "inline-block";
    pauseBtn.style.display = "none";
});

resetBtn.addEventListener("click", () => {
    running = false;
    clearInterval(ticker);
    elapsed  = 0;
    firedSet = new Set();
    startBtn.style.display = "inline-block";
    pauseBtn.style.display = "none";
    updateDisplay();
    buildTimeline();
});

// 時間プリセット
document.querySelectorAll(".durationBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        if (running) return; // 実行中は変更不可
        document.querySelectorAll(".durationBtn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        totalSec = Number(btn.dataset.min) * 60;
        elapsed  = 0;
        firedSet = new Set();
        updateDisplay();
        buildTimeline();
    });
});

// ──────────────────────────────────────
// 初期化
// ──────────────────────────────────────

buildTimeline();
updateDisplay();
