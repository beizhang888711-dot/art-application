// ======================================
// Art Reflection
// script.js
// ======================================

const startButton = document.getElementById("startButton");

if (startButton) {

    startButton.addEventListener("click", () => {

        startButton.textContent = "テーマを準備中...";

        startButton.disabled = true;

        setTimeout(() => {

            window.location.href = "theme.html";

        }, 500);

    });

}