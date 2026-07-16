//-------------------------------------
// Modal
//-------------------------------------

const modal =
document.getElementById("modal");

const modalTitle =
document.getElementById("modalTitle");

const modalImage =
document.getElementById("modalImage");

const modalReflection =
document.getElementById("modalReflection");

const modalKeywords =
document.getElementById("modalKeywords");

const modalDate =
document.getElementById("modalDate");

const modalDownload =
document.getElementById("modalDownload");

document
.getElementById("closeModal")
.onclick=()=>{

    modal.style.display="none";

};

modal.onclick=(e)=>{

    if(e.target===modal){

        modal.style.display="none";

    }

};
// ======================================
// Gallery
// ======================================

const galleryGrid =
document.getElementById("galleryGrid");

const emptyState =
document.getElementById("emptyState");

const searchInput =
document.getElementById("searchInput");

const sortSelect =
document.getElementById("sortSelect");

//-------------------------------------
// データ取得
//-------------------------------------

let gallery = JSON.parse(

    localStorage.getItem("gallery")

) || [];

//-------------------------------------
// 表示
//-------------------------------------

function renderGallery(){

    galleryGrid.innerHTML="";

    if(gallery.length===0){

        galleryGrid.style.display="none";

        emptyState.style.display="block";

        return;

    }

    galleryGrid.style.display="grid";

    emptyState.style.display="none";

    //---------------------------------

    let list=[...gallery];

    //---------------------------------
    // 検索
    //---------------------------------

    const keyword=
    searchInput.value
    .toLowerCase();

    list=list.filter(work=>{

        return work.title
        .toLowerCase()
        .includes(keyword);

    });

    //---------------------------------
    // 並び替え
    //---------------------------------

    if(sortSelect.value==="new"){

        list.reverse();

    }

    //---------------------------------
    // カード生成
    //---------------------------------

    list.forEach((work,index)=>{

        const card=document.createElement("div");

        card.className=
        "galleryCard glass";

        //---------------------------------

        const keywords=
        work.keywords
        .map(k=>{

            return `
            <span class="keyword">
                ${k}
            </span>
            `;

        }).join("");

        //---------------------------------

        card.innerHTML=`

        <img
            class="galleryImage"
            src="${work.image}">

        <div class="cardBody">

            <h2 class="cardTitle">

                ${work.title}

            </h2>

            <div class="cardDate">

                ${work.createdAt}

            </div>

            <p class="cardReflection">

                ${work.reflection}

            </p>

            <div class="keywordArea">

                ${keywords}

            </div>

            <div class="cardButtons">

                <button
                    class="mainButton detailBtn">

                    👁 詳細

                </button>

                <button
                    class="subButton deleteBtn">

                    🗑 削除

                </button>

            </div>

        </div>

        `;

        //---------------------------------
        // 削除
        //---------------------------------

        card
        .querySelector(".deleteBtn")
        .onclick=()=>{

            if(confirm("削除しますか？")){

                gallery.splice(index,1);

                localStorage.setItem(

                    "gallery",

                    JSON.stringify(gallery)

                );

                renderGallery();

            }

        };

//---------------------------------
// 詳細（モーダル表示）
//---------------------------------

card
.querySelector(".detailBtn")
.onclick=()=>{

    modal.style.display = "flex";

    modalTitle.textContent = work.title;

    modalImage.src = work.image;

    modalReflection.textContent = work.reflection;

    modalDate.textContent = work.createdAt;

    modalKeywords.innerHTML = "";

    work.keywords.forEach(k=>{

        const tag = document.createElement("span");

        tag.className = "keyword";

        tag.textContent = k;

        modalKeywords.appendChild(tag);

    });

    modalDownload.onclick = ()=>{

        const link = document.createElement("a");

        link.href = work.image;

        link.download = `${work.title}.png`;

        link.click();

    };

};

        //---------------------------------

        galleryGrid.appendChild(card);

    });

}

//-------------------------------------
// 検索
//-------------------------------------

searchInput
.addEventListener(

    "input",

    renderGallery

);

//-------------------------------------
// 並び替え
//-------------------------------------

sortSelect
.addEventListener(

    "change",

    renderGallery

);

//-------------------------------------
// 初期表示
//-------------------------------------

renderGallery();