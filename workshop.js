// ======================================
// Art Reflection
// workshop.js
// ======================================

const chatArea = document.getElementById("chatArea");
const input = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");

const progressFill = document.querySelector(".progressFill");
const progressValue = document.getElementById("progressValue");

const artwork = document.querySelector(".previewArtwork");

const emotionBars = document.querySelectorAll(".fill");

let step = 0;
let memories = [];

const questions = [

"ありがとうございます。では、その時に一番印象に残っている『色』は何ですか？",

"その景色には誰がいましたか？",

"その思い出を一言で表すなら？",

"とても素敵です。最後に、その感情を一つの季節で表すとしたら？"

];

function addMessage(text, type){

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

function updateProgress(){

    let percent = 20 + (step * 20);

    if(percent > 100){

        percent = 100;

    }

    progressFill.style.width = percent + "%";
    progressValue.textContent = percent + "%";

}

function updateEmotion(){

    emotionBars.forEach(bar=>{

        const random = Math.floor(Math.random()*70)+20;

        bar.style.width = random + "%";

    });

}

function updateArtwork(){

    const gradients = [

"linear-gradient(135deg,#dbeafe,#ede9fe)",

"linear-gradient(135deg,#ffd6e7,#fde68a)",

"linear-gradient(135deg,#bbf7d0,#93c5fd)",

"linear-gradient(135deg,#fbcfe8,#c4b5fd)",

"linear-gradient(135deg,#fdba74,#fca5a5)"

];

    artwork.style.background = gradients[step % gradients.length];

    artwork.innerHTML = `
        <div class="artPlaceholder">
            あなたの作品が少しずつ形になっています...
        </div>
    `;

}

function finishWorkshop(){

    const btn = document.createElement("button");

    btn.className = "mainButton";

    btn.style.marginTop = "30px";

    btn.textContent = "作品を生成する";

    btn.onclick = () => {

    localStorage.setItem(
        "reflectionData",
        JSON.stringify(memories)
    );

    window.location.href = "artwork.html";

};

    document.querySelector(".previewPanel").appendChild(btn);

}

function send() {

    const text = input.value.trim();

    if (text === "") return;

    memories.push(text);

    addMessage(text, "user");

    input.value = "";

    sendButton.disabled = true;

    setTimeout(() => {

        if (step < questions.length) {

            addMessage(questions[step], "ai");

            step++;

            updateProgress();
            updateEmotion();
            updateArtwork();

            // 次の入力を許可
            sendButton.disabled = false;

        } else {

            addMessage(
                "ありがとうございます。あなた自身の物語が十分に集まりました。",
                "ai"
            );

            updateProgress();
            finishWorkshop();

            // 入力終了
            input.disabled = true;
            sendButton.style.display = "none";
        }

    }, 1000);

}

sendButton.addEventListener("click",send);

input.addEventListener("keypress",(e)=>{

    if(e.key==="Enter"){

        send();

    }

});