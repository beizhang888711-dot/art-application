// ======================================
// Art Reflection
// script.js
// ======================================

const startButton    = document.getElementById("startButton");
const introModal     = document.getElementById("introModal");
const introModalStart= document.getElementById("introModalStart");

let countdownTimer = null;

function startCountdown() {
    const el = document.getElementById("introCountdown");
    let remaining = 10;
    if (el) el.textContent = remaining;

    countdownTimer = setInterval(() => {
        remaining--;
        if (el) el.textContent = remaining > 0 ? remaining : "";
        if (remaining <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
            // 10秒後はモーダルを閉じるだけ（遷移しない）
            if (introModal) introModal.style.display = "none";
        }
    }, 1000);
}

function stopCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    const el = document.getElementById("introCountdown");
    if (el) el.textContent = "";
}

function goToTheme() {
    if (introModalStart) {
        introModalStart.textContent = "準備中...";
        introModalStart.disabled    = true;
    }
    setTimeout(() => { window.location.href = "theme.html"; }, 400);
}

// 「作品をつくる」→ 説明モーダルを表示してカウントダウン開始
if (startButton) {
    startButton.addEventListener("click", () => {
        introModal.style.display = "flex";
        introModal.focus?.();
        startCountdown();
    });
}

// モーダル内「はじめる」→ 即遷移
if (introModalStart) {
    introModalStart.addEventListener("click", () => {
        stopCountdown();
        goToTheme();
    });
}

// モーダル背景クリックで閉じる（カウントダウンも止める）
if (introModal) {
    introModal.addEventListener("click", e => {
        if (e.target === introModal) {
            stopCountdown();
            introModal.style.display = "none";
        }
    });
}
