// ======================================
// Artwork Generator
// ======================================

// ======================================
// IBM Consulting Advantage API（gpt-4o）
// APIキーはプロキシサーバー（proxy.js）側で管理
// ======================================

const PROXY_ENDPOINT = "http://localhost:3000/proxy";

async function fetchAIParams(memories) {

    const response = await fetch(`${PROXY_ENDPOINT}/generate-params`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();

}

//-----------------------------
// Canvas（フォールバック用）
//-----------------------------

const canvas = document.getElementById("artCanvas");
const ctx = canvas.getContext("2d");

const w = canvas.width;
const h = canvas.height;

//-----------------------------
// Workshopの回答取得
//-----------------------------

const memories =
    JSON.parse(
        localStorage.getItem("reflectionData")
    ) || [];

const text = memories.join(" ").toLowerCase();

console.log(memories);

//-----------------------------
// AI画像生成を試みる（失敗時はCanvasにフォールバック）
//-----------------------------

const aiLoading  = document.getElementById("aiLoading");
const aiArtImage = document.getElementById("aiArtImage");

//-----------------------------
// 感情スコア（グローバル）
//-----------------------------

const emotion = {
    calm:50,
    joy:50,
    nostalgia:50,
    anxiety:50,
    energy:50
};

//-----------------------------
// 描画パラメータ（グローバル）
//-----------------------------

const params = {
    palette:[],
    background:"#EEF5FF",
    circles:20,
    curves:15,
    blur:35,
    noise:3500,
    waves:false,
    stars:false,
    petals:false,
    jagged:false
};

// AI取得パラメータをCanvasに適用する関数
function applyAIParams(aiParams) {

    // 感情スコアを上書き
    if (aiParams.emotion) {
        Object.assign(emotion, aiParams.emotion);
    }

    // カラーパレットを上書き
    if (aiParams.palette && aiParams.palette.length) {
        params.palette = [...aiParams.palette];
    }

    // 背景色を上書き
    if (aiParams.background) {
        params.background = aiParams.background;
    }

    // 描画フィーチャーを上書き
    if (aiParams.features) {
        params.waves  = aiParams.features.waves  ?? params.waves;
        params.stars  = aiParams.features.stars  ?? params.stars;
        params.petals = aiParams.features.petals ?? params.petals;
        params.jagged = aiParams.features.jagged ?? params.jagged;
    }

    // タイトル・リフレクションを上書き
    if (aiParams.title) {
        const artTitle = document.getElementById("artTitle");
        if (artTitle) artTitle.textContent = aiParams.title;
    }

    if (aiParams.reflection) {
        const reflectionText = document.getElementById("reflectionText");
        if (reflectionText) reflectionText.textContent = aiParams.reflection;
    }

}

(async () => {

    try {

        const aiParams = await fetchAIParams(memories);
        applyAIParams(aiParams);
        console.log("✅ AIパラメータ取得完了", aiParams);

    } catch (err) {

        console.warn("AIパラメータ取得に失敗。デフォルト描画にフォールバックします。", err);

    } finally {

        // ローディング非表示・Canvas表示
        aiLoading.style.display = "none";
        canvas.style.display    = "block";

        // Canvas描画を実行（AIパラメータ適用後）
        drawArtwork();

    }

})();

function drawArtwork() {

//-----------------------------
// キーワード表示
//-----------------------------

const keywordContainer =
    document.getElementById("keywordContainer");

memories.forEach(word=>{

    const tag=document.createElement("div");

    tag.className="keyword";

    tag.textContent=word;

    keywordContainer.appendChild(tag);

});

//-----------------------------
// 色追加
//-----------------------------

function addColor(...colors){

    params.palette.push(...colors);

}

//-----------------------------
// キーワード解析
//-----------------------------

function has(word){

    return text.includes(word);

}

// 夏

if(has("夏")){

    emotion.joy+=30;

    emotion.energy+=20;

    addColor(

        "#FFD166",

        "#FFB703",

        "#FB8500"

    );

}

// 海

if(has("海")){

    emotion.calm+=30;

    params.waves=true;

    addColor(

        "#90E0EF",

        "#48CAE4",

        "#0077B6"

    );

}

// 空

if(has("空")){

    emotion.calm+=20;

    addColor(

        "#ADE8F4",

        "#CAF0F8",

        "#48CAE4"

    );

}

// 夜

if(has("夜")){

    emotion.calm+=10;

    params.stars=true;

    params.background="#071426";

    addColor(

        "#264653",

        "#355070",

        "#1D3557"

    );

}

// 森

if(has("森")){

    emotion.calm+=15;

    addColor(

        "#588157",

        "#3A5A40",

        "#A3B18A"

    );

}

// 桜

if(has("桜")){

    params.petals=true;

    emotion.joy+=15;

    addColor(

        "#F7CAD0",

        "#F4ACB7",

        "#FFB3C6"

    );

}

// 安心

if(has("安心")){

    emotion.calm+=40;

    params.circles+=25;

    params.blur=50;

}

// 不安

if(has("不安")){

    emotion.anxiety+=45;

    params.noise=7000;

    params.curves=30;

    params.jagged=true;

}

// 祖父

if(has("祖父")){

    emotion.nostalgia+=40;

    addColor(

        "#B08968",

        "#DDB892",

        "#A98467"

    );

}

// 母

if(has("母")){

    emotion.nostalgia+=20;

    addColor(

        "#F8C8DC",

        "#F497B6",

        "#E9AFA3"

    );

}

// 父

if(has("父")){

    emotion.energy+=15;

    addColor(

        "#5E6472",

        "#4F5D75",

        "#2D3142"

    );

}

//-----------------------------
// デフォルト色
//-----------------------------

if(params.palette.length===0){

    params.palette=[

        "#6C8CFF",

        "#9D7CFF",

        "#8AE6CF",

        "#FF9EB7"

    ];

}

//-----------------------------
// ランダムカラー
//-----------------------------

function randomColor(){

    return params.palette[

        Math.floor(
            Math.random()*params.palette.length
        )

    ];

}

//-----------------------------
// ランダム関数
//-----------------------------

function rand(min,max){

    return Math.random()*(max-min)+min;

}

console.log(emotion);

console.log(params);
// ======================================
// Part 2
// Canvas Drawing
// ======================================

//-----------------------------
// 背景
//-----------------------------

function drawBackground(){

    const bg = ctx.createLinearGradient(
        0,
        0,
        w,
        h
    );

    bg.addColorStop(0, params.background);
    bg.addColorStop(1, "#FFFFFF");

    ctx.fillStyle = bg;
    ctx.fillRect(0,0,w,h);

}

//-----------------------------
// ガラスモーフィズムの円
//-----------------------------

function drawGlassCircles(){

    ctx.save();

    ctx.filter = `blur(${params.blur}px)`;

    ctx.globalAlpha = 0.28;

    for(let i=0;i<params.circles;i++){

        ctx.beginPath();

        ctx.fillStyle = randomColor();

        ctx.arc(

            rand(0,w),
            rand(0,h),

            rand(50,130),

            0,

            Math.PI*2

        );

        ctx.fill();

    }

    ctx.restore();

}

//-----------------------------
// 曲線
//-----------------------------

function drawCurves(){

    ctx.save();

    ctx.globalAlpha=.45;

    for(let i=0;i<params.curves;i++){

        ctx.beginPath();

        ctx.strokeStyle=randomColor();

        ctx.lineWidth=rand(2,8);

        ctx.moveTo(

            rand(0,w),
            rand(0,h)

        );

        ctx.bezierCurveTo(

            rand(0,w),
            rand(0,h),

            rand(0,w),
            rand(0,h),

            rand(0,w),
            rand(0,h)

        );

        ctx.stroke();

    }

    ctx.restore();

}

//-----------------------------
// 小さな円
//-----------------------------

function drawParticles(){

    ctx.save();

    ctx.globalAlpha=.75;

    for(let i=0;i<60;i++){

        ctx.beginPath();

        ctx.fillStyle=randomColor();

        ctx.arc(

            rand(0,w),
            rand(0,h),

            rand(4,18),

            0,

            Math.PI*2

        );

        ctx.fill();

    }

    ctx.restore();

}

//-----------------------------
// ノイズ
//-----------------------------

function drawNoise(){

    ctx.save();

    ctx.globalAlpha=.08;

    for(let i=0;i<params.noise;i++){

        ctx.fillStyle="#000";

        ctx.fillRect(

            rand(0,w),

            rand(0,h),

            1,

            1

        );

    }

    ctx.restore();

}
// ======================================
// Part 3
// Special Effects
// ======================================

//-----------------------------
// 波（海）
//-----------------------------

function drawWaves(){

    if(!params.waves) return;

    ctx.save();

    ctx.globalAlpha = .45;

    ctx.strokeStyle = "#6DD5FA";

    ctx.lineWidth = 5;

    for(let wave=0; wave<3; wave++){

        ctx.beginPath();

        for(let x=0; x<w; x++){

            const y =
                h*0.35 +
                wave*80 +
                Math.sin(x*0.02 + wave)*20;

            if(x===0){

                ctx.moveTo(x,y);

            }else{

                ctx.lineTo(x,y);

            }

        }

        ctx.stroke();

    }

    ctx.restore();

}

//-----------------------------
// 星空（夜）
//-----------------------------

function drawStars(){

    if(!params.stars) return;

    ctx.save();

    ctx.globalAlpha = .9;

    for(let i=0;i<180;i++){

        ctx.beginPath();

        ctx.fillStyle="white";

        ctx.arc(

            rand(0,w),

            rand(0,h),

            rand(1,3),

            0,

            Math.PI*2

        );

        ctx.fill();

    }

    ctx.restore();

}

//-----------------------------
// 桜
//-----------------------------

function drawPetals(){

    if(!params.petals) return;

    ctx.save();

    ctx.globalAlpha=.55;

    for(let i=0;i<70;i++){

        const x = rand(0,w);
        const y = rand(0,h);

        ctx.translate(x,y);

        ctx.rotate(rand(0,Math.PI*2));

        ctx.fillStyle=randomColor();

        ctx.beginPath();

        ctx.ellipse(

            0,
            0,

            10,

            5,

            0,

            0,

            Math.PI*2

        );

        ctx.fill();

        ctx.setTransform(1,0,0,1,0,0);

    }

    ctx.restore();

}

//-----------------------------
// ギザギザ（不安）
//-----------------------------

function drawJagged(){

    if(!params.jagged) return;

    ctx.save();

    ctx.globalAlpha=.45;

    for(let i=0;i<15;i++){

        ctx.beginPath();

        ctx.strokeStyle=randomColor();

        ctx.lineWidth=3;

        ctx.moveTo(

            rand(0,w),

            rand(0,h)

        );

        for(let j=0;j<10;j++){

            ctx.lineTo(

                rand(0,w),

                rand(0,h)

            );

        }

        ctx.stroke();

    }

    ctx.restore();

}

//-----------------------------
// 描画開始
//-----------------------------

drawBackground();

drawGlassCircles();

drawCurves();

drawWaves();

drawStars();

drawPetals();

drawJagged();

drawParticles();

drawNoise();
// ======================================
// Part 4
// Title & Reflection
// ======================================

//-----------------------------
// タイトル生成
//-----------------------------

function generateTitle(){

    if(
        emotion.nostalgia > 80 &&
        emotion.joy > 70
    ){
        return "Golden Memories";
    }

    if(
        emotion.calm > 80 &&
        params.waves
    ){
        return "Ocean Reflection";
    }

    if(
        emotion.anxiety > 80
    ){
        return "Fragments of Emotion";
    }

    if(params.stars){
        return "Silent Night";
    }

    if(params.petals){
        return "Bloom";
    }

    return "Reflection";

}

const title = generateTitle();

//-----------------------------
// タイトル表示
//-----------------------------

const artTitle =
document.getElementById("artTitle");

if(artTitle){

    artTitle.textContent = title;

}

//-----------------------------
// AI Reflection
//-----------------------------

function generateReflection(){

    let text =
    "あなたの回答から抽象的な感情を読み取り、色・形・構図へ変換して作品を生成しました。";

    if(params.waves){

        text +=
        "\n\n海に関する記憶は流れる波として表現されています。";

    }

    if(params.stars){

        text +=
        "\n\n夜というイメージから静かな星空を重ねています。";

    }

    if(params.petals){

        text +=
        "\n\n桜の記憶は舞い散る花びらとして作品に加えられました。";

    }

    if(params.jagged){

        text +=
        "\n\n不安という感情は鋭い線やノイズとして表現されています。";

    }

    if(emotion.nostalgia>70){

        text +=
        "\n\n懐かしさを感じる回答から暖かい茶色を中心に構成しました。";

    }

    if(emotion.calm>70){

        text +=
        "\n\n安心感を柔らかな円形とぼかしで表しています。";

    }

    return text;

}

const reflection =
document.getElementById("reflectionText");

if(reflection){

    reflection.textContent =
    generateReflection();

}

//-----------------------------
// キーワードを強調表示
//-----------------------------

document
.querySelectorAll(".keyword")
.forEach(tag=>{

    tag.style.opacity="0";

    tag.style.transform="translateY(15px)";

});

setTimeout(()=>{

    document
    .querySelectorAll(".keyword")
    .forEach((tag,index)=>{

        setTimeout(()=>{

            tag.style.transition=".5s";

            tag.style.opacity="1";

            tag.style.transform="translateY(0px)";

        },index*120);

    });

},300);

//-----------------------------
// Canvasフェードイン
//-----------------------------

canvas.style.opacity="0";

canvas.style.transform="scale(.92)";

setTimeout(()=>{

    canvas.style.transition="1.8s";

    canvas.style.opacity="1";

    canvas.style.transform="scale(1)";

},200);

console.log("Artwork Complete");
// ======================================
// Gallery Save
// ======================================

const saveGalleryBtn =
document.getElementById("saveGalleryBtn");

if(saveGalleryBtn){

    saveGalleryBtn.onclick = ()=>{

        // 既存データ取得
        const gallery = JSON.parse(

            localStorage.getItem("gallery")

        ) || [];

        // Canvas画像を取得
 const image = canvas.toDataURL("image/png");

// 同じ作品が保存済みか確認
const alreadySaved = gallery.some(work => work.image === image);

if(alreadySaved){

    alert("この作品はすでに保存されています。");

    return;

}

// 新しい作品を保存
gallery.push({

    title: title,

    image: image,

    reflection: generateReflection(),

    keywords: memories,

    createdAt: new Date().toLocaleDateString("ja-JP")

});

// 保存
localStorage.setItem(

    "gallery",

    JSON.stringify(gallery)

);

// ボタンを保存済みに変更
saveGalleryBtn.textContent = "✅ 保存済み";
saveGalleryBtn.disabled = true;

alert("ギャラリーに保存しました！");

    };

}

} // end drawArtwork