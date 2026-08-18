// ======================================
// Bloom
// script.js
// ======================================

const startButton    = document.getElementById("startButton");
const introModal     = document.getElementById("introModal");
const introModalStart= document.getElementById("introModalStart");

let countdownTimer = null;

function startCountdown() {
    const countEl = document.getElementById("introCountdown");
    const msgEl   = document.getElementById("introCountdownMsg");
    let remaining = 10;
    if (countEl) countEl.textContent = remaining;

    // ボタンを無効化
    if (introModalStart) introModalStart.disabled = true;

    countdownTimer = setInterval(() => {
        remaining--;
        if (countEl) countEl.textContent = remaining > 0 ? remaining : "";
        if (remaining <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
            // 10秒経過 → ボタンを有効化してラベルを切替
            if (introModalStart) introModalStart.disabled = false;
            if (msgEl)   msgEl.textContent   = "はじめる ";
            if (countEl) countEl.textContent = "";
        }
    }, 1000);
}

function stopCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    const countEl = document.getElementById("introCountdown");
    const msgEl   = document.getElementById("introCountdownMsg");
    if (countEl) countEl.textContent = "";
    if (msgEl)   msgEl.textContent   = "はじめる ";
    if (introModalStart) introModalStart.disabled = false;
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
