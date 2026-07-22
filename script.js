// ======================================
// Art Reflection
// script.js
// ======================================

const startButton    = document.getElementById("startButton");
const introModal     = document.getElementById("introModal");
const introModalStart= document.getElementById("introModalStart");

// 「作品をつくる」→ 説明モーダルを表示
if (startButton) {
    startButton.addEventListener("click", () => {
        introModal.style.display = "flex";
        introModal.focus?.();
    });
}

// モーダル内「はじめる →」→ theme.html へ遷移
if (introModalStart) {
    introModalStart.addEventListener("click", () => {
        introModalStart.textContent = "準備中...";
        introModalStart.disabled    = true;
        setTimeout(() => {
            window.location.href = "theme.html";
        }, 400);
    });
}

// モーダル背景クリックで閉じる
if (introModal) {
    introModal.addEventListener("click", e => {
        if (e.target === introModal) introModal.style.display = "none";
    });
}
