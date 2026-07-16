const memories =
JSON.parse(
    localStorage.getItem("reflectionData")
) || [];
// =========================================
// AI Abstract Artwork Generator
// =========================================

const canvas = document.getElementById("artCanvas");
const ctx = canvas.getContext("2d");

const w = canvas.width;
const h = canvas.height;

// ----------------------------
// ランダム
// ----------------------------

function rand(min,max){

    return Math.random()*(max-min)+min;

}

const text = memories.join(" ");

let palette = [];

if(text.includes("海")){

    palette.push("#2E86DE");
    palette.push("#5DADE2");

}

if(text.includes("夏")){

    palette.push("#FFD166");
    palette.push("#F4A261");

}

if(text.includes("夕焼け")){

    palette.push("#FF7F50");

}

if(text.includes("祖父")){

    palette.push("#C68B59");

}

if(text.includes("安心")){

    palette.push("#A8E6CF");

}

function randomColor(){

    if(palette.length>0){

        return palette[
            Math.floor(Math.random()*palette.length)
        ];

    }

    const colors=[

        "#6C8CFF",
        "#9D7CFF",
        "#FF9EB7",
        "#8AE6CF"

    ];

    return colors[
        Math.floor(Math.random()*colors.length)
    ];

}

// ----------------------------
// 背景
// ----------------------------

const bg=ctx.createLinearGradient(0,0,w,h);

bg.addColorStop(0,"#EEF5FF");
bg.addColorStop(1,"#FFFFFF");

ctx.fillStyle=bg;
ctx.fillRect(0,0,w,h);

// ----------------------------
// Blur Circle
// ----------------------------

for(let i=0;i<18;i++){

    ctx.beginPath();

    ctx.globalAlpha=0.22;

    ctx.fillStyle=randomColor();

    ctx.filter="blur(35px)";

    ctx.arc(

        rand(0,w),

        rand(0,h),

        rand(40,120),

        0,

        Math.PI*2

    );

    ctx.fill();

}

ctx.filter="none";

// ----------------------------
// Curves
// ----------------------------

ctx.globalAlpha=.45;

for(let i=0;i<15;i++){

    ctx.beginPath();

    ctx.strokeStyle=randomColor();

    ctx.lineWidth=rand(2,8);

    ctx.moveTo(rand(0,w),rand(0,h));

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

// ----------------------------
// Floating Circles
// ----------------------------

ctx.globalAlpha=.7;

for(let i=0;i<45;i++){

    ctx.beginPath();

    ctx.fillStyle=randomColor();

    ctx.arc(

        rand(0,w),

        rand(0,h),

        rand(5,18),

        0,

        Math.PI*2

    );

    ctx.fill();

}

// ----------------------------
// White Noise
// ----------------------------

ctx.globalAlpha=.08;

for(let i=0;i<3500;i++){

    ctx.fillStyle="#000";

    ctx.fillRect(

        rand(0,w),

        rand(0,h),

        1,

        1

    );

}

// ----------------------------
// Title Fade
// ----------------------------

ctx.globalAlpha=.15;

ctx.font="bold 90px sans-serif";

ctx.fillStyle="#000";

ctx.fillText(

    "Reflection",

    60,

    630

);

// ----------------------------
// Reveal Animation
// ----------------------------

canvas.style.filter="blur(30px)";
canvas.style.opacity="0";

setTimeout(()=>{

    canvas.style.transition="2.5s";

    canvas.style.opacity="1";

    canvas.style.filter="blur(0px)";

},200);