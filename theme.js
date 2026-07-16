// ======================================
// Theme Selection
// ======================================

const cards = document.querySelectorAll(".themeCard");

const customInput =
document.getElementById("customTheme");

const startButton =
document.getElementById("startWorkshop");

let selectedTheme = "";

// ======================================
// テーマカード選択
// ======================================

cards.forEach(card=>{

    card.addEventListener("click",()=>{

        // 選択状態をリセット
        cards.forEach(c=>{

            c.classList.remove("selected");

        });

        // 選択状態にする
        card.classList.add("selected");

        selectedTheme = card.dataset.theme;

        // 自由入力をクリア
        customInput.value="";

    });

});

// ======================================
// ワークショップ開始
// ======================================

startButton.addEventListener("click",()=>{

    // 自由入力が優先
    const customTheme =
    customInput.value.trim();

    const theme =

        customTheme ||

        selectedTheme;

    if(theme===""){

        alert("テーマを選択してください。");

        return;

    }

    // テーマ保存
    localStorage.setItem(

        "selectedTheme",

        theme

    );

    // ワークショップへ
    window.location.href="workshop.html";

});