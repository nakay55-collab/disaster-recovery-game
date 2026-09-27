"use strict";

// ===== 編集用設定：チーム・見た目・速度・PROJECT3のルールはここで変更できます =====
const CONFIG = {
  teamCountOptions: [5, 4], // 選べるチーム数（表示順）
  initialTeamNames: ["赤チーム", "青チーム", "黄チーム", "緑チーム", "白チーム"],
  teamColors: ["#d94a3d", "#2f6fb3", "#ffcc45", "#3f9142", "#ffffff"], // initialTeamNamesと同じ並び順。4チームのときは先頭から4つを使用
  ladderRows: 10, // あみだくじの段数（多いほど複雑に見える）
  animationDurationMs: 4000, // ルートが伸びる演出の長さ（3000〜5000を推奨）
  defaultProject3PickOrder: "bottom-first", // PROJECT3の初期ルール："bottom-first"（下位から）または"top-first"（上位から）
  storageKey: "amida-order-tool-v3", // チーム数や色を変えた場合はバージョンを変更
};
// ===== 以下は画面・進行処理 =====
const app = document.getElementById("app");
const resetDialog = document.getElementById("reset-dialog");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function isLightColor(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85;
}
// 白などの明るい色でも見失わないよう、スウォッチ用のクラス名をまとめて返します。
function swatchClass(color, extra) { return `${extra}${isLightColor(color) ? ` ${extra}--light` : ""}`; }

// ----- あみだくじの生成・計算 -----
// ある段に置ける横線の組み合わせ（隣り合う位置を同時に選ばない）をすべて列挙します。
// 「左から順に見て確率で置く」方式だと左端が有利になる偏りが出るため、
// 有効な組み合わせを毎段すべて洗い出し、そこから均等に1つを選びます。
function validRowPatterns(slotCount) {
  const patterns = [];
  function build(index, current) {
    patterns.push(current.slice());
    for (let i = index; i < slotCount; i++) {
      if (current.length === 0 || current[current.length - 1] < i - 1) {
        current.push(i);
        build(i + 1, current);
        current.pop();
      }
    }
  }
  build(0, []);
  return patterns;
}
// 隣り合う縦線だけをつなぎ、同じ段で横線が重ならないように生成します。
function generateLadder(teamCount, rows) {
  const patterns = validRowPatterns(teamCount - 1);
  for (let attempt = 0; attempt < 20; attempt++) {
    const rungs = [];
    let total = 0;
    for (let r = 0; r < rows; r++) {
      const chosen = patterns[Math.floor(Math.random() * patterns.length)];
      const row = new Array(teamCount - 1).fill(false);
      chosen.forEach(i => { row[i] = true; total++; });
      rungs.push(row);
    }
    if (total > 0) return rungs; // 横線が1本もない（何も起きない）くじは作り直す
  }
  const rungs = Array.from({ length: rows }, () => new Array(teamCount - 1).fill(false));
  rungs[0][0] = true;
  return rungs;
}
function traceRoute(entranceCol, rungs, teamCount) {
  let col = entranceCol;
  for (let r = 0; r < rungs.length; r++) {
    const row = rungs[r];
    if (col > 0 && row[col - 1]) col -= 1;
    else if (col < teamCount - 1 && row[col]) col += 1;
  }
  return col;
}
function computeExits(rungs, entranceOfTeam) {
  const teamCount = entranceOfTeam.length;
  return entranceOfTeam.map(col => traceRoute(col, rungs, teamCount));
}
// 1〜チーム数の番号をランダムな並びにします（Fisher-Yates）。
// あみだくじ自体は少ない段数だと「端の入口ほど元の位置に近く着地しやすい」という偏りが構造的に残りますが、
// どの物理的な列に何番の番号を割り当てるかを毎回シャッフルすることで、
// どの入口を選んでも最終順位が均等になることを保証します。
function shuffledRanks(teamCount) {
  const arr = range(teamCount).map(i => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
// exitOfTeam（各チームがたどり着いた物理的な列）と、その列に割り当てられた番号（numberOrder）から、
// 「順位ごとにどのチームか」の配列を作ります（result[0]が1位のチーム番号、という並び）。
function computeResult(exitOfTeam, numberOrder) {
  const teamCount = exitOfTeam.length;
  const result = new Array(teamCount).fill(null);
  exitOfTeam.forEach((exitCol, teamIndex) => {
    const rank = numberOrder[exitCol];
    result[rank - 1] = teamIndex;
  });
  return result;
}
function ladderGeometry(teamCount) {
  const colGap = 100, marginX = 50, rowH = 30;
  const entranceLabelY = 20, gridTopY = 55;
  const gridBottomY = gridTopY + CONFIG.ladderRows * rowH;
  const numberLabelY = gridBottomY + 28; // 常時表示する「1・2・3…」の番号
  const exitLabelY = numberLabelY + 32; // 結果発表で浮かび上がるチーム名
  const width = marginX * 2 + (teamCount - 1) * colGap;
  const height = exitLabelY + 14;
  return { rowH, entranceLabelY, gridTopY, gridBottomY, numberLabelY, exitLabelY, width, height, colX: i => marginX + i * colGap };
}
// 入口から下までの経路を、SVGのパス文字列として組み立てます。
function buildPathD(entranceCol, rungs, geo, teamCount) {
  let col = entranceCol;
  const points = [[geo.colX(col), geo.entranceLabelY], [geo.colX(col), geo.gridTopY]];
  for (let r = 0; r < rungs.length; r++) {
    const row = rungs[r];
    const yTop = geo.gridTopY + r * geo.rowH, yMid = yTop + geo.rowH / 2, yBottom = yTop + geo.rowH;
    points.push([geo.colX(col), yMid]);
    let newCol = col;
    if (col > 0 && row[col - 1]) newCol = col - 1;
    else if (col < teamCount - 1 && row[col]) newCol = col + 1;
    if (newCol !== col) points.push([geo.colX(newCol), yMid]);
    col = newCol;
    points.push([geo.colX(col), yBottom]);
  }
  points.push([geo.colX(col), geo.numberLabelY - 8]); // 番号の少し上で止め、番号と重ならないようにする
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
}
function renderLadderSvg(geo, showPaths) {
  const rungs = state.ladder;
  const teamCount = state.teamCount;
  let svg = `<svg class="ladder-svg" viewBox="0 0 ${geo.width} ${geo.height}" role="img" aria-label="あみだくじ">`;
  for (let col = 0; col < teamCount; col++) {
    const teamIndex = state.entranceOfTeam.findIndex(v => v === col);
    const color = teamIndex !== -1 ? CONFIG.teamColors[teamIndex] : "#c7c8c3";
    const light = teamIndex === -1 || isLightColor(color);
    svg += `<circle cx="${geo.colX(col)}" cy="${geo.entranceLabelY - 6}" r="11" fill="${color}" stroke="#292c30" stroke-width="${light ? 2.5 : 1.5}" stroke-opacity="${light ? 1 : 0.25}"></circle>`;
  }
  for (let col = 0; col < teamCount; col++) {
    svg += `<line x1="${geo.colX(col)}" y1="${geo.gridTopY}" x2="${geo.colX(col)}" y2="${geo.gridBottomY}" stroke="#d8d9d4" stroke-width="4" stroke-linecap="round"/>`;
  }
  if (rungs) {
    rungs.forEach((row, r) => {
      const y = geo.gridTopY + r * geo.rowH + geo.rowH / 2;
      row.forEach((has, i) => {
        if (has) svg += `<line x1="${geo.colX(i)}" y1="${y}" x2="${geo.colX(i + 1)}" y2="${y}" stroke="#d8d9d4" stroke-width="4" stroke-linecap="round"/>`;
      });
    });
  }
  if (showPaths && rungs) {
    for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {
      const d = buildPathD(state.entranceOfTeam[teamIndex], rungs, geo, teamCount);
      // 白などの明るい色は、線の下に濃い縁取りを先に描いてから色を重ね、見失わないようにします（縁取りも本線と同じ速さで伸びます）。
      if (isLightColor(CONFIG.teamColors[teamIndex])) svg += `<path class="team-path-shadow" data-team="${teamIndex}" d="${d}" fill="none" stroke="#292c30" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.28"></path>`;
      svg += `<path class="team-path" data-team="${teamIndex}" d="${d}" fill="none" stroke="${CONFIG.teamColors[teamIndex]}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path>`;
    }
  }
  for (let col = 0; col < teamCount; col++) {
    const number = state.numberOrder ? state.numberOrder[col] : col + 1;
    svg += `<text x="${geo.colX(col)}" y="${geo.numberLabelY}" class="exit-number">${number}</text>`;
  }
  for (let col = 0; col < teamCount; col++) {
    svg += `<text id="exit-label-${col}" x="${geo.colX(col)}" y="${geo.exitLabelY}" class="exit-label">${showPaths ? "" : "？"}</text>`;
  }
  svg += `</svg>`;
  return svg;
}

// ----- 状態管理 -----
const freshState = () => ({
  status: "start", // start | count | teams | ranking | entrances | ladder | result
  project: null,
  teamCount: null,
  teamNames: null,
  pickOrderMode: null,
  ranking: null,
  pickOrder: null,
  turnIndex: 0,
  entranceOfTeam: null,
  ladder: null,
  numberOrder: null,
  exitOfTeam: null,
  result: null,
});
function validState(s) {
  const statuses = ["start", "count", "teams", "ranking", "entrances", "ladder", "result"];
  if (!s || !statuses.includes(s.status)) return false;
  if (s.status === "start") return true;
  if (!["PROJECT2", "PROJECT3"].includes(s.project)) return false;
  if (s.status === "count") return true;
  if (!CONFIG.teamCountOptions.includes(s.teamCount)) return false;
  if (!Array.isArray(s.teamNames) || s.teamNames.length !== s.teamCount || !s.teamNames.every(n => typeof n === "string")) return false;
  if (!Array.isArray(s.entranceOfTeam) || s.entranceOfTeam.length !== s.teamCount) return false;
  if (s.status === "teams") return true;
  if (!["top-first", "bottom-first"].includes(s.pickOrderMode)) return false;
  if (s.status === "ranking") return true;
  if (!Array.isArray(s.ranking) || s.ranking.length !== s.teamCount || new Set(s.ranking).size !== s.teamCount) return false;
  if (!Array.isArray(s.pickOrder) || s.pickOrder.length !== s.teamCount) return false;
  if (s.status === "entrances") return Number.isInteger(s.turnIndex) && s.turnIndex >= 0 && s.turnIndex <= s.teamCount;
  if (s.entranceOfTeam.filter(v => v !== null).length !== s.teamCount) return false;
  if (s.status === "ladder") return true;
  if (!Array.isArray(s.numberOrder) || s.numberOrder.length !== s.teamCount || new Set(s.numberOrder).size !== s.teamCount) return false;
  if (!Array.isArray(s.exitOfTeam) || s.exitOfTeam.length !== s.teamCount) return false;
  return Array.isArray(s.result) && s.result.length === s.teamCount;
}
let storageBroken = false;
function storageWarning() {
  storageBroken = true;
  document.getElementById("storage-warning").hidden = false;
}
function readState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!validState(saved)) throw new Error("Invalid saved data");
    return saved;
  } catch { storageWarning(); return null; }
}
function saveState() {
  try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); }
  catch { storageWarning(); }
}
function focusHeading() {
  const heading = app.querySelector("h1, h2");
  heading?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function range(n) { return Array.from({ length: n }, (_, i) => i); }
let state = readState() || freshState();
let pendingAnimate = false;

// ----- 画面ごとの描画 -----
function renderStart() {
  app.innerHTML = `<section class="panel"><p class="eyebrow">FAIR ORDER DRAW</p><h1 tabindex="-1">工事選択順 あみだくじ</h1><p class="intro">チームの工事を選ぶ順番を決めます</p><div class="project-choice"><button type="button" class="project-button" data-project="PROJECT2">PROJECT2</button><button type="button" class="project-button" data-project="PROJECT3">PROJECT3</button></div><p class="small">あみだくじの結果は「工事を選ぶ順番」だけを決めます。工事そのものは自動で割り当てません。</p></section>`;
  app.querySelectorAll("[data-project]").forEach(btn => {
    btn.onclick = () => {
      state.project = btn.dataset.project;
      state.pickOrderMode = state.project === "PROJECT2" ? "top-first" : CONFIG.defaultProject3PickOrder;
      state.status = "count";
      saveState(); render(); focusHeading();
    };
  });
}
function renderCount() {
  app.innerHTML = `<section class="panel"><p class="eyebrow">${escapeHtml(state.project)}</p><h1 tabindex="-1">チーム数を選ぶ</h1><p class="intro">何チームで行いますか？</p><div class="project-choice">${CONFIG.teamCountOptions.map(n => `<button type="button" class="project-button" data-count="${n}">${n}チーム</button>`).join("")}</div></section>`;
  app.querySelectorAll("[data-count]").forEach(btn => {
    btn.onclick = () => {
      const n = Number(btn.dataset.count);
      state.teamCount = n;
      state.teamNames = CONFIG.initialTeamNames.slice(0, n);
      state.entranceOfTeam = new Array(n).fill(null);
      state.status = "teams";
      saveState(); render(); focusHeading();
    };
  });
}
function renderTeams() {
  app.innerHTML = `<section class="panel"><p class="eyebrow">${escapeHtml(state.project)}・${state.teamCount}チーム</p><h1 tabindex="-1">チーム名の確認</h1><p class="intro">必要であればチーム名を変更してください。</p><div class="team-strip">${state.teamNames.map((name, i) => `<div class="team-card"><span class="${swatchClass(CONFIG.teamColors[i], "team-swatch")}" style="background:${CONFIG.teamColors[i]}"></span><input type="text" class="team-name-input" data-team-index="${i}" value="${escapeHtml(name)}" maxlength="12"></div>`).join("")}</div><button id="next" type="button" class="primary wide">スタート位置を決める</button></section>`;
  document.getElementById("next").onclick = () => {
    const inputs = [...app.querySelectorAll("[data-team-index]")];
    state.teamNames = inputs.map((input, i) => input.value.trim() || CONFIG.initialTeamNames[i]);
    state.status = "ranking";
    saveState(); render(); focusHeading();
  };
}
function renderRanking() {
  const isProject3 = state.project === "PROJECT3";
  const defaultRanking = state.ranking || state.teamNames.map((_, i) => i);
  app.innerHTML = `<section class="panel" style="--team-count:${state.teamCount}"><p class="eyebrow">${escapeHtml(state.project)}</p><h1 tabindex="-1">現在の順位を入力</h1><p class="intro">${isProject3 ? "PROJECT3の現在順位を入力してください。" : "前のプロジェクトの報酬順位を、1位から入力してください。"}</p>${isProject3 ? `<div class="order-toggle" role="group" aria-label="入口を選ぶ順番"><button type="button" data-order="top-first" aria-pressed="${state.pickOrderMode === "top-first"}">上位から選ぶ</button><button type="button" data-order="bottom-first" aria-pressed="${state.pickOrderMode === "bottom-first"}">下位から選ぶ</button></div>` : ""}<div class="rank-grid">${range(state.teamCount).map(rank => `<div class="rank-field"><label for="rank-${rank}">${rank + 1}位</label><div class="rank-select-row"><span id="rank-swatch-${rank}" class="${swatchClass(CONFIG.teamColors[defaultRanking[rank]], "rank-swatch")}" style="background:${CONFIG.teamColors[defaultRanking[rank]]}"></span><select id="rank-${rank}" data-rank="${rank}">${state.teamNames.map((name, i) => `<option value="${i}" ${defaultRanking[rank] === i ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></div></div>`).join("")}</div><p id="error" class="error" role="alert"></p><button id="next" type="button" class="primary wide">入口選びへ進む</button></section>`;
  if (isProject3) {
    app.querySelectorAll("[data-order]").forEach(btn => {
      btn.onclick = () => {
        state.pickOrderMode = btn.dataset.order;
        saveState();
        app.querySelectorAll("[data-order]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
      };
    });
  }
  app.querySelectorAll("[data-rank]").forEach(select => {
    select.onchange = () => {
      const rank = select.dataset.rank;
      const teamIndex = Number(select.value);
      const swatch = document.getElementById(`rank-swatch-${rank}`);
      swatch.style.background = CONFIG.teamColors[teamIndex];
      swatch.className = swatchClass(CONFIG.teamColors[teamIndex], "rank-swatch");
    };
  });
  document.getElementById("next").onclick = () => {
    const ranking = [...app.querySelectorAll("[data-rank]")].map(s => Number(s.value));
    if (new Set(ranking).size !== state.teamCount) {
      document.getElementById("error").textContent = "各チームを1回ずつ選んでください";
      return;
    }
    state.ranking = ranking;
    state.pickOrder = state.pickOrderMode === "top-first" ? ranking.slice() : ranking.slice().reverse();
    state.turnIndex = 0;
    state.status = "entrances";
    saveState(); render(); focusHeading();
  };
}
function renderEntrances() {
  const currentTeam = state.pickOrder[state.turnIndex];
  const currentColor = CONFIG.teamColors[currentTeam];
  const currentLight = isLightColor(currentColor);
  app.innerHTML = `<section class="panel" style="--team-count:${state.teamCount}"><p class="eyebrow">${escapeHtml(state.project)}</p><h1 tabindex="-1">入口を選ぶ</h1><div class="turn-banner${currentLight ? " turn-banner--light" : ""}" style="${currentLight ? "" : `background:${currentColor}22;border:2px solid ${currentColor}`}"><span class="${swatchClass(currentColor, "turn-swatch")}" style="background:${currentColor}"></span>${escapeHtml(state.teamNames[currentTeam])} の番です</div><div class="pick-order-list">${state.pickOrder.map((teamIndex, order) => `<span class="pick-order-item ${order < state.turnIndex ? "is-done" : ""}"><span class="${swatchClass(CONFIG.teamColors[teamIndex], "dot")}" style="background:${CONFIG.teamColors[teamIndex]}"></span>${order + 1}. ${escapeHtml(state.teamNames[teamIndex])}${state.entranceOfTeam[teamIndex] !== null ? `（入口${state.entranceOfTeam[teamIndex] + 1}）` : ""}</span>`).join("")}</div><div class="entrance-grid">${range(state.teamCount).map(col => {
    const ownerTeam = state.entranceOfTeam.findIndex(v => v === col);
    const taken = ownerTeam !== -1;
    return `<button type="button" class="entrance-button" data-entrance="${col}" data-taken="${taken}" ${taken ? "disabled" : ""}><span class="entrance-num">入口${col + 1}</span>${taken ? `<span class="${swatchClass(CONFIG.teamColors[ownerTeam], "entrance-dot")}" style="background:${CONFIG.teamColors[ownerTeam]}"></span><span>${escapeHtml(state.teamNames[ownerTeam])}</span>` : "<span>選択可</span>"}</button>`;
  }).join("")}</div></section>`;
  app.querySelectorAll("[data-entrance]").forEach(btn => {
    btn.onclick = () => {
      if (btn.dataset.taken === "true") return;
      state.entranceOfTeam[currentTeam] = Number(btn.dataset.entrance);
      state.turnIndex++;
      if (state.turnIndex >= state.teamCount) state.status = "ladder";
      saveState(); render(); focusHeading();
    };
  });
}
function renderLadder() {
  const geo = ladderGeometry(state.teamCount);
  app.innerHTML = `<section class="panel"><p class="eyebrow">${escapeHtml(state.project)}</p><h1 tabindex="-1">あみだくじの準備</h1><p class="intro">「くじを作る」でランダムなあみだくじを作成し、「あみだスタート」で結果を見ます。</p><div class="ladder-actions"><button id="build" type="button" class="secondary wide">くじを作る</button><button id="go" type="button" class="primary wide" ${state.ladder ? "" : "disabled"}>あみだスタート</button></div><div class="ladder-wrap">${renderLadderSvg(geo, false)}</div><p class="small">「あみだスタート」を押すと、入口とチームの変更ができなくなります。</p></section>`;
  document.getElementById("build").onclick = () => {
    state.ladder = generateLadder(state.teamCount, CONFIG.ladderRows);
    state.numberOrder = shuffledRanks(state.teamCount);
    saveState(); render(); focusHeading();
  };
  document.getElementById("go").onclick = () => {
    if (!state.ladder) return;
    state.exitOfTeam = computeExits(state.ladder, state.entranceOfTeam);
    state.result = computeResult(state.exitOfTeam, state.numberOrder);
    state.status = "result";
    saveState();
    pendingAnimate = true;
    render(); focusHeading();
  };
}
function showResultList() {
  state.exitOfTeam.forEach((exitCol, teamIndex) => {
    const label = document.getElementById(`exit-label-${exitCol}`);
    if (label) { label.textContent = state.teamNames[teamIndex]; label.setAttribute("fill", isLightColor(CONFIG.teamColors[teamIndex]) ? "#292c30" : CONFIG.teamColors[teamIndex]); }
  });
  const wrap = document.getElementById("result-list-wrap");
  wrap.innerHTML = `<div class="result-list">${state.result.map((teamIndex, i) => `<div class="result-row"><span class="result-rank">${i + 1}</span><span class="result-team"><span class="${swatchClass(CONFIG.teamColors[teamIndex], "result-swatch")}" style="background:${CONFIG.teamColors[teamIndex]}"></span>${escapeHtml(state.teamNames[teamIndex])}</span></div>`).join("")}</div><p class="result-note">この順番で、工事を選ぶ順を決めてください。</p>`;
}
function renderResult(animate) {
  const geo = ladderGeometry(state.teamCount);
  app.innerHTML = `<section class="panel"><p class="eyebrow">${escapeHtml(state.project)}</p><h1 tabindex="-1" id="result-heading">${animate ? "どこに行くかな…？" : "工事選択順が決まりました"}</h1><div class="ladder-wrap">${renderLadderSvg(geo, true)}</div><div id="result-list-wrap"></div><button id="retry" type="button" class="primary wide" ${animate ? "hidden" : ""}>もう一度</button></section>`;
  document.getElementById("retry").onclick = () => {
    state.ladder = generateLadder(state.teamCount, CONFIG.ladderRows);
    state.numberOrder = shuffledRanks(state.teamCount);
    state.exitOfTeam = computeExits(state.ladder, state.entranceOfTeam);
    state.result = computeResult(state.exitOfTeam, state.numberOrder);
    saveState();
    pendingAnimate = true;
    render(); focusHeading();
  };
  if (!animate) { showResultList(); return; }
  animatePaths();
}
// 色が伸びていく過程を、先端の丸い目印と一緒にコマ送りで見せます（CSSトランジション任せにせず、毎フレーム位置を計算）。
function animatePaths() {
  const svg = app.querySelector(".ladder-svg");
  const teams = [...app.querySelectorAll(".team-path")].map(path => {
    const teamIndex = Number(path.dataset.team);
    const shadow = app.querySelector(`.team-path-shadow[data-team="${teamIndex}"]`);
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    if (shadow) { shadow.style.strokeDasharray = String(length); shadow.style.strokeDashoffset = String(length); }
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    marker.setAttribute("r", "9");
    marker.setAttribute("class", `team-marker${isLightColor(CONFIG.teamColors[teamIndex]) ? " team-marker--light" : ""}`);
    marker.setAttribute("fill", CONFIG.teamColors[teamIndex]);
    svg.appendChild(marker);
    return { path, shadow, length, marker };
  });
  const duration = CONFIG.animationDurationMs;
  const startTime = Date.now();
  function step() {
    const t = Math.min(1, (Date.now() - startTime) / duration);
    teams.forEach(({ path, shadow, length, marker }) => {
      const revealed = length * t;
      const offset = String(length - revealed);
      path.style.strokeDashoffset = offset;
      if (shadow) shadow.style.strokeDashoffset = offset;
      const point = path.getPointAtLength(revealed);
      marker.setAttribute("cx", point.x);
      marker.setAttribute("cy", point.y);
    });
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      teams.forEach(({ marker }) => marker.remove());
      showResultList();
      const heading = document.getElementById("result-heading");
      if (heading) heading.textContent = "工事選択順が決まりました";
      const retryBtn = document.getElementById("retry");
      if (retryBtn) retryBtn.hidden = false;
    }
  }
  requestAnimationFrame(step);
}
function render() {
  if (state.status === "start") renderStart();
  else if (state.status === "count") renderCount();
  else if (state.status === "teams") renderTeams();
  else if (state.status === "ranking") renderRanking();
  else if (state.status === "entrances") renderEntrances();
  else if (state.status === "ladder") renderLadder();
  else {
    const animate = pendingAnimate;
    pendingAnimate = false;
    renderResult(animate);
  }
}
document.getElementById("reset").onclick = () => resetDialog.showModal();
document.getElementById("cancel-reset").onclick = () => resetDialog.close();
document.getElementById("confirm-reset").onclick = () => {
  state = freshState();
  saveState();
  resetDialog.close();
  render(); focusHeading();
};
saveState(); // 開始前に保存可否を確認
render();
