// ======================================
// gallery.js
// ======================================

// ──────────────────────────────────────
// 発表テーマ定義
// ──────────────────────────────────────

const SHARE_THEMES = {
    favorite:    "⭐ 一番気に入った",
    closest:     "🎯 想像に一番近かった",
    surprising:  "😲 一番想像と違った",
    aiInterpret: "🤖 AIの解釈が面白かった",
    emotion:     "💫 気持ちが変化した"
};

// ──────────────────────────────────────
// DOM
// ──────────────────────────────────────

const modal             = document.getElementById("modal");
const modalTitle        = document.getElementById("modalTitle");
const modalImage        = document.getElementById("modalImage");
const modalReflection   = document.getElementById("modalReflection");
const modalKeywords     = document.getElementById("modalKeywords");
const modalDate         = document.getElementById("modalDate");
const modalDownload     = document.getElementById("modalDownload");
const galleryGrid       = document.getElementById("galleryGrid");
const emptyState        = document.getElementById("emptyState");
const searchInput       = document.getElementById("searchInput");
const sortSelect        = document.getElementById("sortSelect");
const shareBanner       = document.getElementById("shareBanner");
const shareConfirmed    = document.getElementById("shareConfirmed");
const shareConfirmedList= document.getElementById("shareConfirmedList");
const enterShareModeBtn = document.getElementById("enterShareModeBtn");
const shareCancelBtn    = document.getElementById("shareCancelBtn");
const shareResetBtn     = document.getElementById("shareResetBtn");

document.getElementById("closeModal").onclick = () => { modal.style.display = "none"; };
modal.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

// ──────────────────────────────────────
// 状態
// selectedWorks: Map<artworkId, themeKey>
// ──────────────────────────────────────

let gallery       = JSON.parse(localStorage.getItem("gallery")) || [];
let shareMode     = false;
let selectedWorks = new Map(); // artworkId → themeKey

// ──────────────────────────────────────
// 発表モード ON / OFF
// ──────────────────────────────────────

function enterShareMode() {
    shareMode = true;
    shareBanner.style.display       = "block";
    enterShareModeBtn.style.display = "none";
    document.getElementById("galleryHeader").querySelector("p").textContent =
        "発表したい作品を選び、テーマを設定してください（複数可）";
    renderGallery();
}

function exitShareMode() {
    shareMode     = false;
    selectedWorks = new Map();
    shareBanner.style.display       = "none";
    shareConfirmed.style.display    = "none";
    enterShareModeBtn.style.display = "inline-flex";
    document.getElementById("galleryHeader").querySelector("p").textContent =
        "あなたがAIと共創した作品一覧";
    renderGallery();
}

// バナーのテーマボタン → 選択中の全作品に一括適用
document.getElementById("shareThemes").addEventListener("click", e => {
    const btn = e.target.closest(".shareThemeBtn");
    if (!btn) return;
    const theme = btn.dataset.theme;
    // 全選択作品に同じテーマを設定
    for (const id of selectedWorks.keys()) {
        selectedWorks.set(id, theme);
    }
    // ボタンのハイライト更新
    document.querySelectorAll(".shareThemeBtn").forEach(b =>
        b.classList.toggle("shareThemeBtn--active", b.dataset.theme === theme)
    );
    if (selectedWorks.size > 0) {
        renderShareConfirmed();
        persistShareSelection();
    }
});

enterShareModeBtn.addEventListener("click", enterShareMode);
shareCancelBtn.addEventListener("click", exitShareMode);

shareResetBtn.addEventListener("click", () => {
    selectedWorks = new Map();
    shareConfirmed.style.display = "none";
    renderGallery();
});

// ──────────────────────────────────────
// 発表選択を localStorage に保存
// ──────────────────────────────────────

function persistShareSelection() {
    const entries = [...selectedWorks.entries()].map(([id, theme]) => {
        const work = gallery.find(w => w.artworkId === id);
        return {
            artworkId:  id,
            title:      work?.title || "",
            theme:      theme,
            themeLabel: SHARE_THEMES[theme] || theme
        };
    });
    localStorage.setItem("shareSelection", JSON.stringify({
        entries,
        selectedAt: new Date().toISOString()
    }));
}

// ──────────────────────────────────────
// ギャラリー描画
// ──────────────────────────────────────

function renderGallery() {
    galleryGrid.innerHTML = "";

    if (gallery.length === 0) {
        galleryGrid.style.display = "none";
        emptyState.style.display  = "block";
        return;
    }

    galleryGrid.style.display = "grid";
    emptyState.style.display  = "none";

    let list = [...gallery];

    // 検索
    const kw = searchInput.value.toLowerCase();
    list = list.filter(w => w.title.toLowerCase().includes(kw));

    // 並び替え
    if (sortSelect.value === "new") list.reverse();

    // 発表モード中は選択済みを先頭に
    if (shareMode && selectedWorks.size > 0) {
        list.sort((a, b) => {
            const asel = a.artworkId && selectedWorks.has(a.artworkId) ? 0 : 1;
            const bsel = b.artworkId && selectedWorks.has(b.artworkId) ? 0 : 1;
            return asel - bsel;
        });
    }

    list.forEach(work => {
        const isSelected = shareMode && work.artworkId != null && selectedWorks.has(work.artworkId);

        const card = document.createElement("div");
        card.className = "galleryCard glass" +
            (shareMode   ? " galleryCard--shareMode" : "") +
            (isSelected  ? " galleryCard--selected"  : "");

        const keywords = work.keywords.map(k =>
            `<span class="keyword">${k}</span>`
        ).join("");

        const selectedBadge = isSelected
            ? `<div class="galleryCard__selectedBadge">✓ 選択中</div>` : "";

        card.innerHTML = `
            ${selectedBadge}
            <img class="galleryImage" src="${work.image}" alt="${work.title}">
            <div class="cardBody">
                <h2 class="cardTitle">${work.title}</h2>
                <div class="cardDate">${work.createdAt}</div>
                <p class="cardReflection">${work.reflection}</p>
                <div class="keywordArea">${keywords}</div>
                <div class="cardButtons">
                    ${shareMode
                        ? `<button class="mainButton selectShareBtn">${isSelected ? "✓ 選択解除" : "この作品を選ぶ"}</button>`
                        : `<button class="mainButton detailBtn">👁 詳細</button>
                           <button class="subButton deleteBtn">🗑 削除</button>`
                    }
                </div>
            </div>
        `;

        // 削除
        const delBtn = card.querySelector(".deleteBtn");
        if (delBtn) {
            delBtn.onclick = () => {
                if (!confirm("削除しますか？")) return;
                const realIdx = gallery.findIndex(w => w.artworkId === work.artworkId);
                if (realIdx !== -1) gallery.splice(realIdx, 1);
                localStorage.setItem("gallery", JSON.stringify(gallery));
                renderGallery();
            };
        }

        // 詳細
        const detBtn = card.querySelector(".detailBtn");
        if (detBtn) detBtn.onclick = () => openModal(work);

        // 発表作品トグル選択
        const selBtn = card.querySelector(".selectShareBtn");
        if (selBtn) selBtn.onclick = () => toggleShareWork(work);

        galleryGrid.appendChild(card);
    });
}

// ──────────────────────────────────────
// 発表作品をトグル選択する
// ──────────────────────────────────────

function toggleShareWork(work) {
    // artworkId がない古い作品にはその場で付与
    if (!work.artworkId) {
        work.artworkId = "art-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
        const idx = gallery.findIndex(w => w.image === work.image);
        if (idx !== -1) {
            gallery[idx].artworkId = work.artworkId;
            localStorage.setItem("gallery", JSON.stringify(gallery));
        }
    }

    if (selectedWorks.has(work.artworkId)) {
        selectedWorks.delete(work.artworkId);
    } else {
        // デフォルトテーマ（未選択）で追加
        selectedWorks.set(work.artworkId, "");
    }

    if (selectedWorks.size === 0) {
        shareConfirmed.style.display = "none";
    } else {
        renderShareConfirmed();
        shareConfirmed.style.display = "block";
    }

    persistShareSelection();
    renderGallery();
}

// ──────────────────────────────────────
// 確定バナーを描画（テーマ選択付き）
// ──────────────────────────────────────

function renderShareConfirmed() {
    const selected = gallery.filter(w => w.artworkId && selectedWorks.has(w.artworkId));
    shareConfirmedList.innerHTML = "";

    selected.forEach(work => {
        const currentTheme = selectedWorks.get(work.artworkId) || "";
        const kw = (work.keywords || []).map(k => `<span class="keyword">${k}</span>`).join("");

        // テーマボタンのHTML
        const themeButtons = Object.entries(SHARE_THEMES).map(([key, label]) =>
            `<button class="itemThemeBtn${currentTheme === key ? " itemThemeBtn--active" : ""}" data-theme="${key}">${label}</button>`
        ).join("");

        const item = document.createElement("div");
        item.className = "shareConfirmed__item";
        item.innerHTML = `
            <img class="shareConfirmed__img" src="${work.image}" alt="${work.title}">
            <div class="shareConfirmed__body">
                <p class="shareConfirmed__title">${work.title}</p>
                <div class="shareConfirmed__themeRow">${themeButtons}</div>
                <p class="shareConfirmed__reflection">${work.reflection || ""}</p>
                <div class="shareConfirmed__keywords">${kw}</div>
            </div>
            <button class="shareConfirmed__removeBtn" aria-label="選択解除">×</button>
        `;

        // テーマボタンのクリック
        item.querySelectorAll(".itemThemeBtn").forEach(btn => {
            btn.onclick = () => {
                const t = btn.dataset.theme;
                // 同じテーマをもう一度押したら解除
                selectedWorks.set(work.artworkId, selectedWorks.get(work.artworkId) === t ? "" : t);
                persistShareSelection();
                renderShareConfirmed();
            };
        });

        // × 削除
        item.querySelector(".shareConfirmed__removeBtn").onclick = () => {
            selectedWorks.delete(work.artworkId);
            if (selectedWorks.size === 0) shareConfirmed.style.display = "none";
            else renderShareConfirmed();
            persistShareSelection();
            renderGallery();
        };

        shareConfirmedList.appendChild(item);
    });
}

// ──────────────────────────────────────
// 詳細モーダル
// ──────────────────────────────────────

function openModal(work) {
    modal.style.display         = "flex";
    modalTitle.textContent      = work.title;
    modalImage.src              = work.image;
    modalReflection.textContent = work.reflection;
    modalDate.textContent       = work.createdAt;
    modalKeywords.innerHTML     = "";
    work.keywords.forEach(k => {
        const tag = document.createElement("span");
        tag.className   = "keyword";
        tag.textContent = k;
        modalKeywords.appendChild(tag);
    });
    modalDownload.onclick = () => {
        const a    = document.createElement("a");
        a.href     = work.image;
        a.download = `${work.title}.png`;
        a.click();
    };
}

// ──────────────────────────────────────
// フラッシュメッセージ
// ──────────────────────────────────────

function showFlash(msg) {
    const el = document.createElement("div");
    el.className   = "galleryFlash";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
}

// ──────────────────────────────────────
// イベント
// ──────────────────────────────────────

searchInput.addEventListener("input",  renderGallery);
sortSelect.addEventListener("change",  renderGallery);

// ──────────────────────────────────────
// 初期表示
// ──────────────────────────────────────

if (sessionStorage.getItem("galleryMode") === "share") {
    sessionStorage.removeItem("galleryMode");
    enterShareMode();
} else {
    renderGallery();
}
