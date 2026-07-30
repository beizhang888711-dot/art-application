// ======================================
// gallery.js
// ======================================

// ──────────────────────────────────────
// 発表テーマ定義
// ──────────────────────────────────────

const SHARE_THEMES = {
    favorite:    "⭐ 一番気に入った作品",
    closest:     "🎯 想像に一番近かった作品",
    surprising:  "😲 一番想像と違った作品",
    aiInterpret: "🤖 AIの解釈が面白かった作品",
    emotion:     "💫 制作前後で気持ちが変化した作品"
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
const enterShareModeBtn = document.getElementById("enterShareModeBtn");
const shareCancelBtn    = document.getElementById("shareCancelBtn");
const shareResetBtn     = document.getElementById("shareResetBtn");
const shareReasonSaveBtn= document.getElementById("shareReasonSaveBtn");

document.getElementById("closeModal").onclick = () => { modal.style.display = "none"; };
modal.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

// ──────────────────────────────────────
// 状態
// ──────────────────────────────────────

let gallery      = JSON.parse(localStorage.getItem("gallery")) || [];
let shareMode    = false;
let activeTheme  = "favorite";
let selectedWork = null; // 発表作品として確定した gallery エントリ

// ──────────────────────────────────────
// 発表モード ON / OFF
// ──────────────────────────────────────

function enterShareMode() {
    shareMode = true;
    shareBanner.style.display    = "block";
    enterShareModeBtn.style.display = "none";
    document.getElementById("galleryHeader").querySelector("p").textContent =
        "発表したい作品をタップして選んでください";
    renderGallery();
}

function exitShareMode() {
    shareMode    = false;
    selectedWork = null;
    shareBanner.style.display      = "none";
    shareConfirmed.style.display   = "none";
    enterShareModeBtn.style.display = "inline-flex";
    document.getElementById("galleryHeader").querySelector("p").textContent =
        "あなたがAIと共創した作品一覧";
    renderGallery();
}

// 発表テーマ切替
document.getElementById("shareThemes").addEventListener("click", e => {
    const btn = e.target.closest(".shareThemeBtn");
    if (!btn) return;
    document.querySelectorAll(".shareThemeBtn").forEach(b => b.classList.remove("shareThemeBtn--active"));
    btn.classList.add("shareThemeBtn--active");
    activeTheme = btn.dataset.theme;
    // 確定済みならテーマ表示を更新
    if (selectedWork) {
        document.getElementById("shareConfirmedTheme").textContent = SHARE_THEMES[activeTheme];
        persistShareSelection();
    }
});

enterShareModeBtn.addEventListener("click", enterShareMode);
shareCancelBtn.addEventListener("click", exitShareMode);

shareResetBtn.addEventListener("click", () => {
    selectedWork = null;
    shareConfirmed.style.display = "none";
    renderGallery();
});

shareReasonSaveBtn.addEventListener("click", () => {
    persistShareSelection();
    showFlash("メモを保存しました");
});

// ──────────────────────────────────────
// 発表選択を localStorage に保存
// ──────────────────────────────────────

function persistShareSelection() {
    if (!selectedWork) return;
    const reason = document.getElementById("shareReason").value.trim();
    localStorage.setItem("shareSelection", JSON.stringify({
        artworkId:   selectedWork.artworkId || null,
        title:       selectedWork.title,
        theme:       activeTheme,
        themeLabel:  SHARE_THEMES[activeTheme],
        reason:      reason,
        selectedAt:  new Date().toISOString()
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
    if (shareMode && selectedWork) {
        list.sort((a, b) =>
            (a.artworkId === selectedWork.artworkId ? -1 :
             b.artworkId === selectedWork.artworkId ?  1 : 0)
        );
    }

    list.forEach((work, index) => {
        const isSelected = shareMode && selectedWork &&
            selectedWork.artworkId === work.artworkId;
        const isDimmed = shareMode && selectedWork && !isSelected;

        const card = document.createElement("div");
        card.className = "galleryCard glass" +
            (shareMode   ? " galleryCard--shareMode" : "") +
            (isSelected  ? " galleryCard--selected"  : "") +
            (isDimmed    ? " galleryCard--dimmed"    : "");

        const keywords = work.keywords.map(k =>
            `<span class="keyword">${k}</span>`
        ).join("");

        const selectedBadge = isSelected
            ? `<div class="galleryCard__selectedBadge">✓ 発表作品</div>` : "";

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
                        ? `<button class="mainButton selectShareBtn">${isSelected ? "✓ 選択済み" : "この作品を発表する"}</button>`
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
                // gallery 配列上の実インデックスを artworkId で特定
                const realIdx = gallery.findIndex(w => w.artworkId === work.artworkId);
                if (realIdx !== -1) gallery.splice(realIdx, 1);
                localStorage.setItem("gallery", JSON.stringify(gallery));
                renderGallery();
            };
        }

        // 詳細
        const detBtn = card.querySelector(".detailBtn");
        if (detBtn) {
            detBtn.onclick = () => openModal(work);
        }

        // 発表作品選択
        const selBtn = card.querySelector(".selectShareBtn");
        if (selBtn) {
            selBtn.onclick = () => confirmShareWork(work);
        }

        galleryGrid.appendChild(card);
    });
}

// ──────────────────────────────────────
// 発表作品を確定する
// ──────────────────────────────────────

function confirmShareWork(work) {
    selectedWork = work;

    // 確定バナーを更新
    document.getElementById("shareConfirmedImg").src   = work.image;
    document.getElementById("shareConfirmedTitle").textContent  = work.title;
    document.getElementById("shareConfirmedTheme").textContent  = SHARE_THEMES[activeTheme];
    document.getElementById("shareReason").value = (() => {
        // 保存済みの理由があれば復元
        try {
            const s = JSON.parse(localStorage.getItem("shareSelection") || "{}");
            return (s.artworkId === work.artworkId) ? (s.reason || "") : "";
        } catch { return ""; }
    })();

    shareConfirmed.style.display = "block";
    shareConfirmed.scrollIntoView({ behavior: "smooth", block: "nearest" });
    persistShareSelection();
    renderGallery(); // バッジ・ボタン状態を更新
}

// ──────────────────────────────────────
// 詳細モーダル
// ──────────────────────────────────────

function openModal(work) {
    modal.style.display     = "flex";
    modalTitle.textContent  = work.title;
    modalImage.src          = work.image;
    modalReflection.textContent = work.reflection;
    modalDate.textContent   = work.createdAt;
    modalKeywords.innerHTML = "";
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
// 初期表示 — artwork.js から galleryMode=share で飛んできた場合は自動で発表モードへ
// ──────────────────────────────────────

if (sessionStorage.getItem("galleryMode") === "share") {
    sessionStorage.removeItem("galleryMode");
    // DOM が揃ってから呼ぶ
    window.addEventListener("DOMContentLoaded", () => {}, { once: true });
    enterShareMode();
} else {
    renderGallery();
}
