// ======================================
// survey-admin.js
// アンケート集計・管理ダッシュボード
// ======================================

const SCORE_KEYS = [
    { key: "expressed",  label: "気持ちを表現できた"    },
    { key: "attachment", label: "作品への愛着"          },
    { key: "involvement",label: "制作への関与感"        },
    { key: "aiHelped",   label: "AIが考えを深める助けに" },
    { key: "again",      label: "また作ってみたい"       }
];

// ──────────────────────────────────────
// データ読み込み
// ──────────────────────────────────────

// サーバー（Supabase）とローカルの両方から取得し、重複なしで結合する
async function loadSurveys() {
    const local = JSON.parse(localStorage.getItem("surveys") || "[]");

    let remote = [];
    try {
        const res = await fetch("/api/surveys");
        if (res.ok) remote = await res.json();
    } catch (err) {
        console.warn("サーバーからのアンケート取得に失敗。ローカルデータのみ表示します:", err);
    }

    // savedAt + artworkId で重複除去（同じ回答が両方にある場合はサーバー側を優先）
    const seen = new Set();
    const merged = [];
    for (const s of [...remote, ...local]) {
        const key = (s.savedAt || "") + "|" + (s.artworkId || "");
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(s);
        }
    }
    return merged;
}

// ──────────────────────────────────────
// 全体集計
// ──────────────────────────────────────

function renderSummary(surveys) {
    const grid = document.getElementById("statGrid");
    grid.innerHTML = "";

    const total = surveys.length;

    // スコアが1件でも入っている回答数
    const withScores = surveys.filter(s =>
        SCORE_KEYS.some(q => s[q.key] !== null && s[q.key] !== undefined)
    ).length;

    // 全スコアの総平均
    const allScores = [];
    surveys.forEach(s => {
        SCORE_KEYS.forEach(q => {
            if (s[q.key] != null) allScores.push(Number(s[q.key]));
        });
    });
    const overallAvg = allScores.length
        ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
        : "—";

    // セッション数
    const sessions = new Set(surveys.map(s => s.workshopSession).filter(Boolean)).size;

    // 感情変化の記録あり
    const withEmotion = surveys.filter(s => s.emotionBefore || s.emotionAfter).length;

    const stats = [
        { val: total,      lbl: "総回答数"         },
        { val: withScores, lbl: "スコアあり回答"   },
        { val: overallAvg, lbl: "総合平均スコア"   },
        { val: sessions,   lbl: "セッション数"     },
        { val: withEmotion,lbl: "感情変化の記録"   }
    ];

    stats.forEach(s => {
        const card = document.createElement("div");
        card.className = "statCard";
        card.innerHTML = `<div class="statCard__val">${s.val}</div><div class="statCard__lbl">${s.lbl}</div>`;
        grid.appendChild(card);
    });
}

// ──────────────────────────────────────
// 設問別スコアバー
// ──────────────────────────────────────

function renderQuestionBars(surveys) {
    const container = document.getElementById("questionBars");
    container.innerHTML = "";

    if (surveys.length === 0) {
        container.innerHTML = '<p class="noData">データがありません。</p>';
        return;
    }

    SCORE_KEYS.forEach(q => {
        const vals = surveys
            .map(s => s[q.key])
            .filter(v => v !== null && v !== undefined)
            .map(Number);

        const avg = vals.length
            ? (vals.reduce((a, b) => a + b, 0) / vals.length)
            : null;

        const row = document.createElement("div");
        row.className = "questionRow";
        row.innerHTML = `
            <span class="questionRow__lbl">${q.label}</span>
            <div class="barTrack">
                <div class="barFill" style="width:${avg ? (avg / 5 * 100).toFixed(1) : 0}%"></div>
            </div>
            <span class="questionRow__avg">${avg !== null ? avg.toFixed(2) : "—"}</span>
        `;
        container.appendChild(row);
    });
}

// ──────────────────────────────────────
// セッション別集計
// ──────────────────────────────────────

function renderSessionCompare(surveys) {
    const container = document.getElementById("sessionCompare");
    container.innerHTML = "";

    // セッションIDでグループ化
    const sessionMap = {};
    surveys.forEach(s => {
        const sid = s.workshopSession || "(不明)";
        if (!sessionMap[sid]) sessionMap[sid] = [];
        sessionMap[sid].push(s);
    });

    const sids = Object.keys(sessionMap);
    if (sids.length === 0) {
        container.innerHTML = '<p class="noData">セッションデータがありません。</p>';
        return;
    }

    sids.forEach(sid => {
        const group = sessionMap[sid];
        const card  = document.createElement("div");
        card.className = "sessionCompareCard";

        // セッションの省略表示（後半5文字）
        const shortSid = sid.length > 12 ? "…" + sid.slice(-8) : sid;

        let rows = SCORE_KEYS.map(q => {
            const vals = group
                .map(s => s[q.key])
                .filter(v => v != null)
                .map(Number);
            const avg = vals.length
                ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
                : "—";
            return `<div class="scBar"><span class="scBar__lbl">${q.label.slice(0, 10)}</span><span class="scBar__val">${avg}</span></div>`;
        }).join("");

        card.innerHTML = `
            <h3>セッション <span class="tag">${shortSid}</span></h3>
            <div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">回答 ${group.length} 件</div>
            ${rows}
        `;
        container.appendChild(card);
    });
}

// ──────────────────────────────────────
// 感情変化一覧
// ──────────────────────────────────────

function renderEmotionList(surveys) {
    const container = document.getElementById("emotionList");
    container.innerHTML = "";

    const withEmotion = surveys.filter(s => s.emotionBefore || s.emotionAfter);
    if (withEmotion.length === 0) {
        container.innerHTML = '<p class="noData">感情変化の記録がありません。</p>';
        return;
    }

    const table = document.createElement("table");
    table.className = "sessionTable";
    table.innerHTML = `
        <thead><tr>
            <th>日時</th>
            <th>制作前の気持ち</th>
            <th></th>
            <th>制作後の気持ち</th>
        </tr></thead>
    `;
    const tbody = document.createElement("tbody");

    withEmotion.forEach(s => {
        const tr = document.createElement("tr");
        const dt = s.savedAt ? new Date(s.savedAt).toLocaleString("ja-JP") : "—";
        tr.innerHTML = `
            <td style="font-size:12px;color:#9ca3af;">${dt}</td>
            <td class="emotionPair"><strong>${escHtml(s.emotionBefore || "—")}</strong></td>
            <td style="color:#a78bfa;font-weight:700;">→</td>
            <td class="emotionPair"><strong>${escHtml(s.emotionAfter || "—")}</strong></td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}

// ──────────────────────────────────────
// 自由記述一覧
// ──────────────────────────────────────

function renderFreeTextList(surveys) {
    const container = document.getElementById("freeTextList");
    container.innerHTML = "";

    const withFree = surveys.filter(s => s.freeText && s.freeText.trim());
    if (withFree.length === 0) {
        container.innerHTML = '<p class="noData">自由記述がありません。</p>';
        return;
    }

    const table = document.createElement("table");
    table.className = "sessionTable";
    table.innerHTML = `<thead><tr><th>日時</th><th>記述内容</th></tr></thead>`;
    const tbody = document.createElement("tbody");

    withFree.forEach(s => {
        const tr = document.createElement("tr");
        const dt = s.savedAt ? new Date(s.savedAt).toLocaleString("ja-JP") : "—";
        tr.innerHTML = `
            <td style="font-size:12px;color:#9ca3af;white-space:nowrap;">${dt}</td>
            <td class="freeRow">${escHtml(s.freeText)}</td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}

// ──────────────────────────────────────
// 全件テーブル
// ──────────────────────────────────────

function renderAllTable(surveys) {
    const tbody = document.getElementById("allTableBody");
    const empty = document.getElementById("tableEmpty");
    tbody.innerHTML = "";

    if (surveys.length === 0) {
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    surveys.forEach(s => {
        const tr = document.createElement("tr");
        const dt = s.savedAt ? new Date(s.savedAt).toLocaleString("ja-JP") : "—";
        const shortSession = s.workshopSession
            ? (s.workshopSession.length > 14 ? "…" + s.workshopSession.slice(-8) : s.workshopSession)
            : "—";
        const shortArt = s.artworkId
            ? (s.artworkId.length > 14 ? "…" + s.artworkId.slice(-8) : s.artworkId)
            : "—";

        tr.innerHTML = `
            <td style="font-size:12px;white-space:nowrap;">${dt}</td>
            <td><span class="tag" title="${escHtml(s.workshopSession||'')}">${escHtml(shortSession)}</span></td>
            <td><span class="tag" title="${escHtml(s.artworkId||'')}">${escHtml(shortArt)}</span></td>
            ${SCORE_KEYS.map(q => `<td style="text-align:center;">${s[q.key] ?? "—"}</td>`).join("")}
            <td class="emotionPair">${escHtml(s.emotionBefore || "")}</td>
            <td class="emotionPair">${escHtml(s.emotionAfter  || "")}</td>
            <td class="freeRow">${escHtml(s.freeText || "")}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ──────────────────────────────────────
// CSV エクスポート
// ──────────────────────────────────────

function exportCSV(surveys) {
    const headers = [
        "回答日時", "セッションID", "作品ID",
        ...SCORE_KEYS.map(q => q.label),
        "感情(制作前)", "感情(制作後)", "自由記述"
    ];

    const rows = surveys.map(s => [
        s.savedAt ? new Date(s.savedAt).toLocaleString("ja-JP") : "",
        s.workshopSession || "",
        s.artworkId       || "",
        ...SCORE_KEYS.map(q => (s[q.key] != null ? s[q.key] : "")),
        s.emotionBefore || "",
        s.emotionAfter  || "",
        s.freeText      || ""
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const bom  = "\uFEFF"; // Excel UTF-8 BOM
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `survey-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ──────────────────────────────────────
// ユーティリティ
// ──────────────────────────────────────

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ──────────────────────────────────────
// 初期化
// ──────────────────────────────────────

async function init() {
    const surveys = await loadSurveys();

    renderSummary(surveys);
    renderQuestionBars(surveys);
    renderSessionCompare(surveys);
    renderEmotionList(surveys);
    renderFreeTextList(surveys);
    renderAllTable(surveys);

    document.getElementById("csvBtn").onclick = async () => {
        const latest = await loadSurveys();
        if (latest.length === 0) {
            alert("エクスポートするデータがありません。");
            return;
        }
        exportCSV(latest);
    };

    document.getElementById("deleteAllBtn").onclick = async () => {
        const latest = await loadSurveys();
        if (latest.length === 0) {
            alert("削除するデータがありません。");
            return;
        }
        const confirmed = confirm(
            `ローカルのアンケート回答 ${latest.length} 件を削除します。\n` +
            `※ サーバー（Supabase）側のデータはこのボタンでは削除されません。\n` +
            `よろしいですか？`
        );
        if (!confirmed) return;
        localStorage.removeItem("surveys");
        await init(); // 再描画
    };
}

document.addEventListener("DOMContentLoaded", init);
