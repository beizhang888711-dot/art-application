// ======================================
// Bloom — workshop.js
// AIが回答に応じて動的に次の質問を生成する
// ======================================

const PROXY_ENDPOINT = "/proxy";
const TOTAL_STEPS    = 5; // 質問数（4フェーズ5問）

// ======================================
// DOM
// ======================================

const chatArea     = document.getElementById("chatArea");
const input        = document.getElementById("userInput");
const sendButton   = document.getElementById("sendButton");
const skipButton   = document.getElementById("skipButton");
const dontKnowBtn  = document.getElementById("dontKnowBtn");
const progressFill = document.querySelector(".progressFill");
const progressValue= document.getElementById("progressValue");
const emotionBars  = document.querySelectorAll(".fill");
const artwork      = document.querySelector(".previewArtwork");
const phaseLabel   = document.getElementById("phaseLabel");
const stepDots     = document.getElementById("stepDots");

// ======================================
// 状態
// ======================================

const selectedTheme = localStorage.getItem("selectedTheme") || "自由";
let step        = 0;     // 現在の質問ステップ（0〜TOTAL_STEPS）
let memories    = [];    // ユーザーの全回答
let history     = [];    // AIに渡す会話履歴 [{role, content}]
let lastSkipped = false; // 直前のステップがスキップされたか

// ======================================
// テーマ表示
// ======================================

const themeName = document.getElementById("themeName");
if (themeName) themeName.textContent = `「${selectedTheme}」`;

// ======================================
// ステップドット更新
// ======================================

function updateStepDots() {
    if (!stepDots) return;
    stepDots.innerHTML = "";
    for (let i = 1; i <= TOTAL_STEPS; i++) {
        const dot = document.createElement("span");
        dot.className = "stepDot" +
            (i < step  ? " stepDot--done" :
             i === step ? " stepDot--active" : "");
        stepDots.appendChild(dot);
    }
}

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

// ── フェーズ定義（冒頭カード＋ヒント文） ──
const PHASE_INFO = {
    1: {
        label:   "ステップ 1 ／ 今の気持ち",
        intro:   "今どんな気持ちか、思い浮かぶ言葉を教えてください。",
        hint:    "あなたの気持ちを作品の「色」や「雰囲気」に変えるための質問です。正解はないので、ぱっと思ったことを書いてみてください。"
    },
    2: {
        label:   "ステップ 2 ／ 気持ちのきっかけ",
        intro:   "その気持ちになったきっかけや背景を聞きます。",
        hint:    "きっかけを知ることで、作品に深みが生まれます。うまく言えなくても大丈夫です。"
    },
    3: {
        label:   "ステップ 3 ／ 色・風景のイメージ",
        intro:   "作品にしたい色や景色のイメージを教えてください。",
        hint:    "頭に浮かぶ色や景色が、作品の見た目のベースになります。正解はありません。"
    },
    4: {
        label:   "ステップ 4 ／ 作品で伝えたいこと",
        intro:   "この作品で一番表したいことを聞かせてください。",
        hint:    "「この作品で何を残したいか」を考える最後の質問です。自分への贈り物だと思って答えてみてください。"
    },
    5: {
        label:   "ステップ 5 ／ 最終確認",
        intro:   "最後にもう一つだけ聞かせてください。",
        hint:    "ここまでの言葉をまとめて、作品づくりへ進みます。"
    }
};

// 前回表示したフェーズ（カード重複防止）
let lastPhaseShown = 0;

// フェーズ冒頭カードをチャットに挿入
function maybeShowPhaseCard(currentStep) {
    const phase = PHASE_INFO[currentStep];
    if (!phase || currentStep === lastPhaseShown) return;
    lastPhaseShown = currentStep;

    const card = document.createElement("div");
    card.className = "phaseCard";
    card.innerHTML = `
        <span class="phaseCard__step">${phase.label}</span>
        <p class="phaseCard__intro">${phase.intro}</p>
    `;
    chatArea.appendChild(card);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// AI質問バブルを「？」ヒントボタン付きで表示
function addAIMessage(text) {
    const message = document.createElement("div");
    message.className = "message ai";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "🤖";

    const wrap = document.createElement("div");
    wrap.className = "aiBubbleWrap";

    const bubbleRow = document.createElement("div");
    bubbleRow.className = "aiBubbleRow";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = text;

    // 「？」ヒントボタン — バブルと横並び、小さく目立たない
    const hintBtn = document.createElement("button");
    hintBtn.className = "msgHintBtn";
    hintBtn.setAttribute("aria-label", "この質問の意図を見る");
    hintBtn.textContent = "?";
    hintBtn.onclick = () => {
        const existing = wrap.querySelector(".msgHint");
        if (existing) { existing.remove(); hintBtn.classList.remove("msgHintBtn--open"); return; }
        const hint = document.createElement("div");
        hint.className = "msgHint";
        hint.textContent = getQuestionHint(step);
        wrap.appendChild(hint);
        hintBtn.classList.add("msgHintBtn--open");
    };

    bubbleRow.appendChild(bubble);
    bubbleRow.appendChild(hintBtn);
    wrap.appendChild(bubbleRow);
    message.appendChild(avatar);
    message.appendChild(wrap);
    chatArea.appendChild(message);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// フェーズごとのヒント文
function getQuestionHint(currentStep) {
    return (PHASE_INFO[currentStep]?.hint) ||
        "あなたの言葉が作品に反映されます。思ったことを自由に書いてください。";
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
    progressFill.style.width  = percent + "%";
    progressValue.innerHTML = percent === 100
        ? `完了 🎉 <strong>すべての質問が終わりました！</strong><br><br>
        右のパネルからスタイルを選んで、「作品を生成する →」を押してください。`
        : `${step} / ${TOTAL_STEPS}`;

    // フェーズラベル更新
    if (phaseLabel) {
        if      (step <= 1) phaseLabel.textContent = "ステップ 1 ／ 今の気持ち";
        else if (step <= 2) phaseLabel.textContent = "ステップ 2 ／ 気持ちのきっかけ";
        else if (step <= 3) phaseLabel.textContent = "ステップ 3 ／ 色・風景のイメージ";
        else                phaseLabel.textContent = "ステップ 4 ／ 作品で伝えたいこと";
    }

    updateStepDots();
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
    // 入力エリアを非表示
    document.querySelector(".inputArea").style.display = "none";

    // スタイル選択パネルを表示
    const stylePanel  = document.getElementById("styleSelectPanel");
    const styleGrid   = document.getElementById("styleGrid");
    const generateBtn = document.getElementById("generateBtn");

    stylePanel.style.display = "block";
    stylePanel.scrollIntoView({ behavior: "smooth", block: "start" });

    let selectedStyle = null;

    // チップ選択
    styleGrid.addEventListener("click", e => {
        const chip = e.target.closest(".styleChip");
        if (!chip) return;
        styleGrid.querySelectorAll(".styleChip").forEach(c => c.classList.remove("styleChip--selected"));
        chip.classList.add("styleChip--selected");
        selectedStyle = chip.dataset.style;
        generateBtn.disabled = false;
        generateBtn.style.opacity = "1";
    });

    // 生成ボタン
    generateBtn.onclick = () => {
        if (!selectedStyle) return;

        // ── 構造化データをワークショップの会話から抽出して保存 ──
        // memories配列: [step1回答, step2回答, ..., step6回答]
        const structured = {
            emotion:        memories[0] || "",   // 感情の言葉
            emotionStrength:memories[1] || "",   // 感情の強さ
            background:     memories[2] || "",   // 背景の出来事
            scene:          memories[3] || "",   // 風景・場面
            colorImage:     memories[4] || "",   // 色のイメージ
            lineForm:       memories[5] || "",   // 線や形の質感
            style:          selectedStyle,
            allAnswers:     memories
        };

        localStorage.setItem("reflectionData",       JSON.stringify(memories));
        localStorage.setItem("conversationHistory",  JSON.stringify(history));
        localStorage.setItem("artworkStructured",    JSON.stringify(structured));
        window.location.href = "artwork.html";
    };
}

// ======================================
// AIに次の質問を生成させる
// ======================================

async function fetchNextQuestion(isSkipped = false) {
    const response = await fetch(`${PROXY_ENDPOINT}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            theme:      selectedTheme,
            history:    history,
            step:       step,
            totalSteps: TOTAL_STEPS,
            isSkipped:  isSkipped
        })
    });
    if (!response.ok) throw new Error(`chat API error: ${response.status}`);
    const data = await response.json();
    return data.question;
}

async function fetchClosingMessage() {
    const response = await fetch(`${PROXY_ENDPOINT}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            theme:      selectedTheme,
            history:    history,
            step:       TOTAL_STEPS,
            totalSteps: TOTAL_STEPS,
            isClosing:  true
        })
    });
    if (!response.ok) throw new Error(`chat API error: ${response.status}`);
    const data = await response.json();
    return data.question.replace(/[？?]/g, "。").replace(/。。/g, "。").trim();
}

// ======================================
// 共通：次の質問を取得して表示
// ======================================

async function proceedToNextQuestion(isSkipped = false) {
    // フェーズが変わった場合は冒頭カードを挿入
    maybeShowPhaseCard(step);
    setInputDisabled(true);
    showTyping();
    try {
        const question = await fetchNextQuestion(isSkipped);
        removeTyping();
        history.push({ role: "assistant", content: question });
        addAIMessage(question);
    } catch {
        removeTyping();
        const fallbacks = [
            "そうなんだね。次に、その気持ちになったきっかけはあるかな？思い浮かぶことを教えてください。",
            "なるほど。頭に浮かぶ色や景色があったら、教えてもらえますか？",
            "ありがとう。この作品で一番表したいことは何かな？"
        ];
        const q = fallbacks[Math.min(step - 1, fallbacks.length - 1)];
        history.push({ role: "assistant", content: q });
        addAIMessage(q);
    }
    setInputDisabled(false);
    input.focus();
}

function setInputDisabled(disabled) {
    sendButton.disabled  = disabled;
    skipButton.disabled  = disabled;
    dontKnowBtn.disabled = disabled;
    input.disabled       = disabled;
}

// ======================================
// 送信処理（通常回答）
// ======================================

async function send() {
    const text = input.value.trim();
    if (text === "") return;

    memories.push(text);
    history.push({ role: "user", content: text });
    addMessage(text, "user");
    input.value = "";
    lastSkipped = false;

    step++;
    updateProgress();
    updateEmotion();
    updateArtworkPreview();

    if (step < TOTAL_STEPS) {
        await proceedToNextQuestion(false);
    } else {
        await showClosing();
    }
}

// ======================================
// スキップ処理
// ======================================

async function skip() {
    addMessage("（スキップ）", "user");
    memories.push("（スキップ）");
    history.push({ role: "user", content: "（この質問はスキップします）" });
    lastSkipped = true;

    step++;
    updateProgress();
    updateEmotion();
    updateArtworkPreview();

    if (step < TOTAL_STEPS) {
        await proceedToNextQuestion(true);
    } else {
        await showClosing();
    }
}

// ======================================
// 「よく分からない」処理
// ======================================

async function dontKnow() {
    addMessage("よく分からない…", "user");
    memories.push("よく分からない");
    history.push({ role: "user", content: "よく分からないので、もっとやさしい質問にしてください。" });
    lastSkipped = false;

    // stepは進めず、AIに言い換えた質問を再生成させる
    setInputDisabled(true);
    showTyping();
    try {
        const question = await fetchNextQuestion(false);
        removeTyping();
        history.push({ role: "assistant", content: question });
        addAIMessage(question);
    } catch {
        removeTyping();
        const fallback = "難しく考えなくて大丈夫です。ぱっと思い浮かんだ言葉を、何でも書いてみてください。";
        history.push({ role: "assistant", content: fallback });
        addAIMessage(fallback);
    }
    setInputDisabled(false);
    input.focus();
}

// ======================================
// 締めの言葉
// ======================================

async function showClosing() {
    setInputDisabled(true);
    showTyping();
    try {
        const closing = await fetchClosingMessage();
        removeTyping();
        history.push({ role: "assistant", content: closing });
        addMessage(closing, "ai");
    } catch {
        removeTyping();
        addMessage("たくさん話してくれてありがとうございます。あなたの言葉が、世界にひとつだけの作品へと変わります。", "ai");
    }
    updateProgress();
    finishWorkshop();
}

sendButton.addEventListener("click", send);
input.addEventListener("keypress", e => {
    if (e.key === "Enter") send();
});
skipButton.addEventListener("click", skip);
dontKnowBtn.addEventListener("click", dontKnow);

// ======================================
// 初回：AIが最初の質問を生成
// ======================================

(async () => {

    setInputDisabled(true);

    // 挨拶メッセージ（全TOTAL_STEPS問の案内を含む）
    const greeting = `こんにちは。今日は<strong>「${selectedTheme}」</strong>をテーマに、あなた自身を映す作品を一緒に作ります。<br><small style="color:#888;">全部で${TOTAL_STEPS}つの質問をします。答えにくい質問はスキップできます。</small>`;
    addMessage(greeting, "ai");

    // ステップ1の冒頭カードを表示
    step = 1;
    maybeShowPhaseCard(step);
    step = 0; // fetchNextQuestion は step=0 のまま呼ぶ（サーバー側で step=1 として扱う）

    showTyping();
    try {
        const firstQuestion = await fetchNextQuestion(false);
        removeTyping();
        history.push({ role: "assistant", content: firstQuestion });
        addAIMessage(firstQuestion);
    } catch (err) {
        console.error("初回質問取得失敗:", err);
        removeTyping();
        const fallback = `「${selectedTheme}」というテーマ、どんな気持ちが浮かびますか？難しく考えなくて大丈夫です。`;
        history.push({ role: "assistant", content: fallback });
        addAIMessage(fallback);
    }

    setInputDisabled(false);
    input.focus();

})();

// ======================================
// ホームへ戻るボタン＋確認ポップアップ
// ======================================

const backHomeBtn       = document.getElementById("backHomeBtn");
const backConfirmModal  = document.getElementById("backConfirmModal");
const backConfirmOk     = document.getElementById("backConfirmOk");
const backConfirmCancel = document.getElementById("backConfirmCancel");

backHomeBtn.addEventListener("click", () => {
    backConfirmModal.style.display = "flex";
});

backConfirmOk.addEventListener("click", () => {
    window.location.href = "index.html";
});

backConfirmCancel.addEventListener("click", () => {
    backConfirmModal.style.display = "none";
});

// 背景クリックでも閉じる
backConfirmModal.addEventListener("click", e => {
    if (e.target === backConfirmModal) {
        backConfirmModal.style.display = "none";
    }
});
