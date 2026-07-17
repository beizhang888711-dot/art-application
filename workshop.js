// ======================================
// Art Reflection — workshop.js
// AIが回答に応じて動的に次の質問を生成する
// ======================================

const PROXY_ENDPOINT = "/api";
const TOTAL_STEPS    = 4; // 質問数

// ======================================
// DOM
// ======================================

const chatArea     = document.getElementById("chatArea");
const input        = document.getElementById("userInput");
const sendButton   = document.getElementById("sendButton");
const progressFill = document.querySelector(".progressFill");
const progressValue= document.getElementById("progressValue");
const emotionBars  = document.querySelectorAll(".fill");
const artwork      = document.querySelector(".previewArtwork");

// ======================================
// 状態
// ======================================

const selectedTheme = localStorage.getItem("selectedTheme") || "自由";
let step     = 0;       // 現在の質問ステップ（0〜TOTAL_STEPS）
let memories = [];      // ユーザーの全回答
let history  = [];      // AIに渡す会話履歴 [{role, content}]

// ======================================
// テーマ表示
// ======================================

const themeName = document.getElementById("themeName");
if (themeName) themeName.textContent = `「${selectedTheme}」`;

// ======================================
// ユーティリティ
// ======================================

function addMessage(text, type) {
    const message = document.createElement("div");
    message.className = "message " + type;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = type === "ai" ? "🤖" : "👤";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = text;

    message.appendChild(avatar);
    message.appendChild(bubble);
    chatArea.appendChild(message);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function showTyping() {
    const el = document.createElement("div");
    el.className = "message ai";
    el.id = "typing";
    el.innerHTML = `<div class="avatar">🤖</div><div class="bubble typing">・・・</div>`;
    chatArea.appendChild(el);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function removeTyping() {
    const el = document.getElementById("typing");
    if (el) el.remove();
}

function updateProgress() {
    const percent = Math.min(Math.round((step / TOTAL_STEPS) * 100), 100);
    progressFill.style.width    = percent + "%";
    progressValue.textContent   = percent + "%";
}

function updateEmotion() {
    emotionBars.forEach(bar => {
        bar.style.width = (Math.floor(Math.random() * 70) + 20) + "%";
    });
}

function updateArtworkPreview() {
    const gradients = [
        "linear-gradient(135deg,#dbeafe,#ede9fe)",
        "linear-gradient(135deg,#ffd6e7,#fde68a)",
        "linear-gradient(135deg,#bbf7d0,#93c5fd)",
        "linear-gradient(135deg,#fbcfe8,#c4b5fd)",
        "linear-gradient(135deg,#fdba74,#fca5a5)"
    ];
    artwork.style.background = gradients[step % gradients.length];
    artwork.innerHTML = `<div class="artPlaceholder">あなたの作品が少しずつ形になっています...</div>`;
}

function finishWorkshop() {
    const btn = document.createElement("button");
    btn.className   = "mainButton";
    btn.style.marginTop = "30px";
    btn.textContent = "作品を生成する";
    btn.onclick = () => {
        localStorage.setItem("reflectionData", JSON.stringify(memories));
        localStorage.setItem("conversationHistory", JSON.stringify(history));
        window.location.href = "artwork.html";
    };
    document.querySelector(".previewPanel").appendChild(btn);
}

// ======================================
// AIに次の質問を生成させる
// ======================================

async function fetchNextQuestion() {
    const response = await fetch(`${PROXY_ENDPOINT}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            theme:      selectedTheme,
            history:    history,
            step:       step,
            totalSteps: TOTAL_STEPS
        })
    });
    if (!response.ok) throw new Error(`chat API error: ${response.status}`);
    const data = await response.json();
    return data.question;
}

// ======================================
// 送信処理
// ======================================

async function send() {
    const text = input.value.trim();
    if (text === "") return;

    // ユーザー発言を記録
    memories.push(text);
    history.push({ role: "user", content: text });
    addMessage(text, "user");
    input.value = "";
    sendButton.disabled = true;
    input.disabled      = true;

    step++;
    updateProgress();
    updateEmotion();
    updateArtworkPreview();

    if (step < TOTAL_STEPS) {

        // AIに次の質問を生成させる
        showTyping();
        try {
            const question = await fetchNextQuestion();
            removeTyping();
            history.push({ role: "assistant", content: question });
            addMessage(question, "ai");
        } catch (err) {
            removeTyping();
            // フォールバック：固定の質問
            const fallbacks = [
                "その時の気持ちをもう少し詳しく教えてもらえますか？",
                "その感情を色で表すとしたら何色ですか？",
                "その思い出の中で一番大切なものは何ですか？"
            ];
            const q = fallbacks[step % fallbacks.length];
            history.push({ role: "assistant", content: q });
            addMessage(q, "ai");
        }

        sendButton.disabled = false;
        input.disabled      = false;
        input.focus();

    } else {

        // 最終ステップ
        showTyping();
        try {
            const closing = await fetchNextQuestion();
            removeTyping();
            history.push({ role: "assistant", content: closing });
            addMessage(closing, "ai");
        } catch {
            removeTyping();
            addMessage("ありがとうございます。あなた自身の物語が十分に集まりました。", "ai");
        }

        updateProgress();
        finishWorkshop();
        input.disabled          = true;
        sendButton.style.display = "none";

    }
}

sendButton.addEventListener("click", send);
input.addEventListener("keypress", e => {
    if (e.key === "Enter") send();
});

// ======================================
// 初回：AIが最初の質問を生成
// ======================================

(async () => {

    sendButton.disabled = true;
    input.disabled      = true;

    // 挨拶メッセージを先に表示
    const greeting = `こんにちは。今日は<strong>「${selectedTheme}」</strong>をテーマに、あなた自身を映す作品を一緒に作ります。`;
    addMessage(greeting, "ai");

    // AIが最初の質問を生成
    showTyping();
    try {
        const firstQuestion = await fetchNextQuestion();
        removeTyping();
        history.push({ role: "assistant", content: firstQuestion });
        addMessage(firstQuestion, "ai");
    } catch {
        removeTyping();
        const fallback = `「${selectedTheme}」というテーマを選んでくれましたね。このテーマを選んだ理由や、最初に浮かんだイメージを教えてください。`;
        history.push({ role: "assistant", content: fallback });
        addMessage(fallback, "ai");
    }

    sendButton.disabled = false;
    input.disabled      = false;
    input.focus();

})();
