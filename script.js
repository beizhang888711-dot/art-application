// ======================================
// Art Reflection
// script.js
// ======================================

// 「作品をつくる」ボタン
const startButton = document.getElementById("startButton");

// ボタンが存在する場合のみイベントを追加
if (startButton) {

    startButton.addEventListener("click", () => {

        // 少しアニメーションを見せてから画面遷移
        startButton.textContent = "読み込み中...";

        setTimeout(() => {
            window.location.href = "workshop.html";
        }, 500);

    });

}