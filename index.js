// ======================================
// Home Gallery
// ======================================

// ギャラリー表示エリア
const homeGallery = document.getElementById("homeGallery");

// 保存された作品を取得
const gallery = JSON.parse(
    localStorage.getItem("gallery")
) || [];

// ======================================
// ホームギャラリー表示
// ======================================

function renderHomeGallery(){

    if(!homeGallery) return;

    homeGallery.innerHTML = "";

    // 新しい作品から最大4件表示
    const latestWorks = [...gallery]
        .reverse()
        .slice(0,4);

    // 作品がない場合
    if(latestWorks.length === 0){

        for(let i=0;i<4;i++){

            const empty = document.createElement("div");

            empty.className = "art";

            homeGallery.appendChild(empty);

        }

        return;

    }

    // 作品カード生成
    latestWorks.forEach(work=>{

        const card = document.createElement("div");

        card.className = "homeCard";

        card.innerHTML = `

            <img src="${work.image}">

            <div class="homeCardBody">

                <div class="homeCardTitle">

                    ${work.title}

                </div>

                <div class="homeCardDate">

                    ${work.createdAt}

                </div>

            </div>

        `;

        // クリックするとGalleryへ
        card.onclick = ()=>{

            window.location.href = "gallery.html";

        };

        homeGallery.appendChild(card);

    });

    // 4枚未満なら空カード追加
    while(homeGallery.children.length < 4){

        const empty = document.createElement("div");

        empty.className = "art";

        homeGallery.appendChild(empty);

    }

}

renderHomeGallery();