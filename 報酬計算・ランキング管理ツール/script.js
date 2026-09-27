"use strict";

// ===== 編集用設定：チーム・ミッション・金額はここで変更できます =====
const CONFIG = {
  teamCount: 5,
  initialTeamNames: ["赤チーム", "青チーム", "黄チーム", "緑チーム", "白チーム"],
  teamColors: ["#d94a3d", "#2f6fb3", "#e8b330", "#3f9142", "#ffffff"], // initialTeamNamesと同じ並び順
  quizCosts: [100, 150], // 追加クイズ費用の候補（万円・正の数）
  manualAdjustments: [50, 100], // 手動調整ボタンの候補（万円・絶対値。+/-両方のボタンに使う）
  defaultBonusAmount: 300, // 地域貢献ボーナスの初期金額（万円）
  storageKey: "reward-ranking-tool-v1", // ミッション構成やチーム数を変えた場合はバージョンを変更
};
// PROJECT1〜3のミッション一覧。番号・名前・報酬（万円）。
const PROJECTS = {
  "1": {
    label: "PROJECT1",
    missions: [
      { number: "①", name: "通学路付近の冠水", reward: 200 },
      { number: "②", name: "側溝のあふれ", reward: 250 },
      { number: "③", name: "生活道路の倒木", reward: 300 },
      { number: "④", name: "公園・歩道の散乱物", reward: 250 },
      { number: "⑤", name: "住宅地の道路冠水", reward: 300 },
      { number: "⑥", name: "集会所への道路障害", reward: 300 },
      { number: "⑦", name: "小学校前の泥・がれき", reward: 350 },
    ],
  },
  "2": {
    label: "PROJECT2",
    missions: [
      { number: "⑧", name: "主要道路への土砂流入", reward: 350 },
      { number: "⑨", name: "大きな倒木で通行止め", reward: 450 },
      { number: "⑩", name: "側溝の大量の泥詰まり", reward: 400 },
      { number: "⑪", name: "道路の締固め・復旧", reward: 450 },
      { number: "⑫", name: "病院へ続く道路の障害", reward: 500 },
    ],
  },
  "3": {
    label: "PROJECT3",
    missions: [
      { number: "A", name: "主要生活道路の路面復旧", reward: 550 },
      { number: "B", name: "商店街へ続く主要道路", reward: 700 },
      { number: "C", name: "住宅地へ続く主要道路", reward: 750 },
      { number: "D", name: "工業地域へ続く主要道路", reward: 850 },
      { number: "E", name: "集会所・公共施設へ続く道路", reward: 700 },
    ],
  },
};
// ここが今回の裏設定です。この定数は「地域貢献ボーナスの発表」処理でしか読み込みません。
// ミッション一覧・確認画面など、生徒の目に触れる可能性のある場所では絶対に参照しないでください。
const BONUS_LINKED_MISSIONS = { "1": "①", "2": "⑧", "3": "A" };
const CATEGORY_LABELS = { "1": "PROJECT1", "2": "PROJECT2", "3": "PROJECT3", quiz: "追加クイズ", manual: "手動調整", bonus: "地域貢献ボーナス" };

// ===== 以下は状態管理・進行処理 =====
const app = document.getElementById("app");
const tabsEl = document.getElementById("tabs");
const projectorEl = document.getElementById("projector");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function isLightColor(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85;
}
function swatchClass(color, extra) { return `${extra}${isLightColor(color) ? ` ${extra}--light` : ""}`; }
function formatTotal(amount) {
  const sign = amount < 0 ? "−" : "";
  return `${sign}${Math.abs(amount).toLocaleString("ja-JP")}万円`;
}
function formatDelta(amount) {
  if (amount === 0) return "0万円";
  const sign = amount > 0 ? "＋" : "−";
  return `${sign}${Math.abs(amount).toLocaleString("ja-JP")}万円`;
}
function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
let idCounter = 0;
function nextId() { idCounter += 1; return `${Date.now()}-${idCounter}`; }

function makeEmptyTeamProject() {
  const obj = {};
  for (let i = 0; i < CONFIG.teamCount; i++) obj[i] = { "1": null, "2": null, "3": null };
  return obj;
}
function makeEmptyMissionOwners() {
  const obj = {};
  Object.keys(PROJECTS).forEach(key => {
    obj[key] = {};
    PROJECTS[key].missions.forEach(m => { obj[key][m.number] = null; });
  });
  return obj;
}
const freshState = () => ({
  teamNames: CONFIG.initialTeamNames.slice(),
  teamProject: makeEmptyTeamProject(),
  missionOwners: makeEmptyMissionOwners(),
  history: [],
  actionLog: [],
  bonusAmount: CONFIG.defaultBonusAmount,
  bonusAnnounced: false,
  bonusGranted: false,
  bonusEligibleTeams: [],
  currentProject: "1",
  selectedTeamIndex: null,
  pendingMissionNumber: null,
});

function validState(s) {
  if (!s || typeof s !== "object") return false;
  if (!Array.isArray(s.teamNames) || s.teamNames.length !== CONFIG.teamCount) return false;
  if (!s.teamProject || !s.missionOwners) return false;
  for (let i = 0; i < CONFIG.teamCount; i++) {
    const tp = s.teamProject[i];
    if (!tp || !("1" in tp) || !("2" in tp) || !("3" in tp)) return false;
  }
  for (const key of Object.keys(PROJECTS)) {
    if (!s.missionOwners[key]) return false;
    for (const m of PROJECTS[key].missions) {
      if (!(m.number in s.missionOwners[key])) return false;
    }
  }
  if (!Array.isArray(s.history) || !Array.isArray(s.actionLog)) return false;
  if (typeof s.bonusAmount !== "number") return false;
  if (typeof s.bonusAnnounced !== "boolean" || typeof s.bonusGranted !== "boolean") return false;
  if (!Array.isArray(s.bonusEligibleTeams)) return false;
  if (!["1", "2", "3", "final"].includes(s.currentProject)) return false;
  return true;
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
let state = readState() || freshState();

// ----- 集計（履歴からその都度計算します。履歴が唯一の正式な記録です） -----
function getTeamHistory(teamIndex) { return state.history.filter(h => h.teamIndex === teamIndex); }
function getTeamTotal(teamIndex) { return getTeamHistory(teamIndex).reduce((sum, h) => sum + h.amount, 0); }
function getTeamCategoryTotal(teamIndex, category) {
  return getTeamHistory(teamIndex).filter(h => h.project === category).reduce((sum, h) => sum + h.amount, 0);
}
function computeRanking() {
  const teams = CONFIG.initialTeamNames.map((_, i) => ({ index: i, name: state.teamNames[i], color: CONFIG.teamColors[i], total: getTeamTotal(i) }));
  teams.sort((a, b) => b.total - a.total);
  let rank = 0, prevTotal = null;
  teams.forEach((t, i) => {
    if (t.total !== prevTotal) { rank = i + 1; prevTotal = t.total; }
    t.rank = rank;
  });
  return teams;
}

// ----- 操作（すべて履歴とactionLogに記録し、Undoで巻き戻せるようにします） -----
function pushHistory(teamIndex, category, kind, label, amount, extra) {
  const entry = Object.assign({ id: nextId(), time: Date.now(), teamIndex, project: category, kind, label, amount }, extra || {});
  state.history.push(entry);
  return entry;
}
function pushAction(type, historyIds, meta) {
  state.actionLog.push({ id: nextId(), type, historyIds, meta: meta || {} });
}
function confirmMission(teamIndex, projectKey, missionNumber) {
  if (state.teamProject[teamIndex][projectKey]) return false;
  if (state.missionOwners[projectKey][missionNumber]) return false;
  const mission = PROJECTS[projectKey].missions.find(m => m.number === missionNumber);
  if (!mission) return false;
  const entry = pushHistory(teamIndex, projectKey, "mission", `${mission.number} ${mission.name}`, mission.reward, { missionNumber });
  state.missionOwners[projectKey][missionNumber] = teamIndex;
  state.teamProject[teamIndex][projectKey] = { missionNumber, reward: mission.reward };
  pushAction("mission", [entry.id], { teamIndex, project: projectKey, missionNumber });
  state.pendingMissionNumber = null;
  return true;
}
function passProject(teamIndex, projectKey) {
  if (state.teamProject[teamIndex][projectKey]) return false;
  const entry = pushHistory(teamIndex, projectKey, "pass", "PASS", 0, {});
  state.teamProject[teamIndex][projectKey] = { pass: true };
  pushAction("pass", [entry.id], { teamIndex, project: projectKey });
  state.pendingMissionNumber = null;
  return true;
}
function cancelProjectResolution(teamIndex, projectKey) {
  const resolution = state.teamProject[teamIndex][projectKey];
  if (!resolution) return false;
  if (resolution.missionNumber) {
    const mission = PROJECTS[projectKey].missions.find(m => m.number === resolution.missionNumber);
    const entry = pushHistory(teamIndex, projectKey, "cancel", `${mission.number} ${mission.name} 取り消し`, -resolution.reward, { missionNumber: resolution.missionNumber });
    state.missionOwners[projectKey][resolution.missionNumber] = null;
    state.teamProject[teamIndex][projectKey] = null;
    pushAction("cancel", [entry.id], { teamIndex, project: projectKey, restore: { missionNumber: resolution.missionNumber, reward: resolution.reward } });
  } else if (resolution.pass) {
    const entry = pushHistory(teamIndex, projectKey, "cancel", "PASS 取り消し", 0, {});
    state.teamProject[teamIndex][projectKey] = null;
    pushAction("cancel", [entry.id], { teamIndex, project: projectKey, restore: { pass: true } });
  }
  if (state.selectedTeamIndex === teamIndex) state.pendingMissionNumber = null;
  return true;
}
function applyQuizCost(teamIndex, cost) {
  const entry = pushHistory(teamIndex, "quiz", "quiz", `カード追加クイズ −${cost}万円`, -cost, {});
  pushAction("quiz", [entry.id], {});
}
function applyManualAdjust(teamIndex, amount) {
  const label = `手動調整 ${formatDelta(amount)}`;
  const entry = pushHistory(teamIndex, "manual", "manual", label, amount, {});
  pushAction("manual", [entry.id], {});
}
function computeBonusEligibleTeams() {
  const eligible = new Set();
  Object.entries(BONUS_LINKED_MISSIONS).forEach(([projectKey, missionNumber]) => {
    const teamIndex = state.missionOwners[projectKey][missionNumber];
    if (teamIndex !== null && teamIndex !== undefined) eligible.add(teamIndex);
  });
  return [...eligible].sort((a, b) => a - b);
}
function announceBonus() {
  state.bonusEligibleTeams = computeBonusEligibleTeams();
  state.bonusAnnounced = true;
}
function grantBonus() {
  if (state.bonusGranted) return;
  const ids = state.bonusEligibleTeams.map(teamIndex => pushHistory(teamIndex, "bonus", "bonus", "地域貢献ボーナス", state.bonusAmount, {}).id);
  pushAction("bonus", ids, {});
  state.bonusGranted = true;
}
function cancelBonus() {
  const idx = state.actionLog.findIndex(a => a.type === "bonus");
  if (idx === -1) return;
  const action = state.actionLog[idx];
  action.historyIds.forEach(id => {
    const i = state.history.findIndex(h => h.id === id);
    if (i !== -1) state.history.splice(i, 1);
  });
  state.actionLog.splice(idx, 1);
  state.bonusGranted = false;
}
function undoLast() {
  const action = state.actionLog.pop();
  if (!action) return;
  action.historyIds.forEach(id => {
    const idx = state.history.findIndex(h => h.id === id);
    if (idx !== -1) state.history.splice(idx, 1);
  });
  switch (action.type) {
    case "mission":
      state.missionOwners[action.meta.project][action.meta.missionNumber] = null;
      state.teamProject[action.meta.teamIndex][action.meta.project] = null;
      break;
    case "pass":
      state.teamProject[action.meta.teamIndex][action.meta.project] = null;
      break;
    case "cancel": {
      const r = action.meta.restore;
      if (r.missionNumber) {
        state.missionOwners[action.meta.project][r.missionNumber] = action.meta.teamIndex;
        state.teamProject[action.meta.teamIndex][action.meta.project] = { missionNumber: r.missionNumber, reward: r.reward };
      } else if (r.pass) {
        state.teamProject[action.meta.teamIndex][action.meta.project] = { pass: true };
      }
      break;
    }
    case "bonus":
      state.bonusGranted = false;
      break;
    default:
      break;
  }
}

// ----- 画面描画 -----
function focusHeading() {
  const heading = app.querySelector("h1, h2");
  heading?.focus({ preventScroll: true });
}
function renderTabs() {
  const tabs = [
    { key: "1", label: "PROJECT1" },
    { key: "2", label: "PROJECT2" },
    { key: "3", label: "PROJECT3" },
    { key: "final", label: "最終結果" },
  ];
  tabsEl.innerHTML = tabs.map(t => `<button type="button" class="tab-button${t.key === "final" ? " final" : ""}" data-tab="${t.key}" aria-selected="${state.currentProject === t.key}">${t.label}</button>`).join("");
  tabsEl.querySelectorAll("[data-tab]").forEach(btn => {
    btn.onclick = () => {
      state.currentProject = btn.dataset.tab;
      state.pendingMissionNumber = null;
      saveState(); render(); focusHeading();
    };
  });
}
function renderTeamCard(team, selected) {
  const negative = team.total < 0 ? " negative" : "";
  return `<div class="team-card" data-team="${team.index}" aria-pressed="${selected}" role="button" tabindex="0">
    <span class="rank-badge">${team.rank}位</span>
    <span class="team-name"><span class="${swatchClass(team.color, "swatch")}" style="background:${team.color}"></span>${escapeHtml(team.name)}</span>
    <span class="team-total${negative}">${formatTotal(team.total)}</span>
    <button type="button" class="rename-link" data-rename="${team.index}">名前を変更</button>
  </div>`;
}
function promptRenameTeam(index) {
  const current = state.teamNames[index];
  const next = window.prompt("新しいチーム名を入力してください", current);
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed) return;
  state.teamNames[index] = trimmed;
  saveState(); render();
}
function renderProjectView(projectKey) {
  const project = PROJECTS[projectKey];
  const ranking = computeRanking();
  const selectedIndex = state.selectedTeamIndex;
  const selectedResolution = selectedIndex !== null ? state.teamProject[selectedIndex][projectKey] : null;

  let selectedPanelHtml;
  if (selectedIndex === null) {
    selectedPanelHtml = `<p class="hint">上のチームを1つ選んでください。</p>`;
  } else {
    const team = ranking.find(t => t.index === selectedIndex);
    const teamLine = `<span class="selected-team-line"><span class="${swatchClass(team.color, "swatch")}" style="background:${team.color}"></span>${escapeHtml(team.name)}（現在 ${formatTotal(team.total)}）</span>`;
    if (selectedResolution) {
      const desc = selectedResolution.pass ? "PASS（0万円）" : `${escapeHtml(selectedResolution.missionNumber)}を担当中（${formatDelta(selectedResolution.reward)}）`;
      selectedPanelHtml = `${teamLine}<div class="already-resolved"><span>この${escapeHtml(project.label)}では、すでに ${desc} です。</span><button type="button" id="btn-cancel-resolution" class="secondary">取り消す</button></div>`;
    } else {
      selectedPanelHtml = `${teamLine}<p class="hint">ミッションを選んで「この工事を確定」を押すか、担当しない場合は「PASS」を押してください。</p><div class="button-row"><button type="button" id="btn-pass" class="pass-button">PASS（報酬0万円）</button></div>
      <div class="button-row">
        ${CONFIG.quizCosts.map(c => `<button type="button" class="money-button minus" data-quiz="${c}">追加クイズ −${c}万円</button>`).join("")}
        ${CONFIG.manualAdjustments.map(a => `<button type="button" class="money-button plus" data-manual="${a}">＋${a}万円</button>`).join("")}
        ${CONFIG.manualAdjustments.map(a => `<button type="button" class="money-button minus" data-manual="${-a}">−${a}万円</button>`).join("")}
      </div>`;
    }
  }

  const canPickMission = selectedIndex !== null && !selectedResolution;
  const missionCardsHtml = project.missions.map(m => {
    const ownerIndex = state.missionOwners[projectKey][m.number];
    const taken = ownerIndex !== null && ownerIndex !== undefined;
    const isPending = state.pendingMissionNumber === m.number;
    const clickable = canPickMission && !taken;
    const classes = ["mission-card"];
    if (taken) classes.push("taken"); else if (clickable) classes.push("available");
    if (isPending) classes.push("selected-pending");
    const ownerColor = taken ? CONFIG.teamColors[ownerIndex] : null;
    const statusText = taken
      ? `<span class="${swatchClass(ownerColor, "swatch")}" style="background:${ownerColor}"></span>選択済み：${escapeHtml(state.teamNames[ownerIndex])}`
      : "未選択";
    const cancelBtn = taken ? `<button type="button" class="cancel-link" data-cancel-mission="${escapeHtml(m.number)}">取り消し</button>` : "";
    // 白など明るい色は境界線だけだと見えにくいため、内側にもう1本濃い線を添えます。
    const cardStyle = taken ? ` style="border-left:8px solid ${ownerColor};${isLightColor(ownerColor) ? "box-shadow:inset 3px 0 0 #292c30;" : ""}"` : "";
    return `<div class="${classes.join(" ")}"${cardStyle} ${clickable ? `data-pick-mission="${escapeHtml(m.number)}" role="button" tabindex="0"` : ""}>
      <span class="mission-number">${escapeHtml(m.number)}</span>
      <span class="mission-name">${escapeHtml(m.name)}</span>
      <span class="mission-reward">${formatDelta(m.reward)}</span>
      <span class="mission-status">${statusText}</span>
      ${cancelBtn}
    </div>`;
  }).join("");

  const confirmBarHtml = (canPickMission && state.pendingMissionNumber)
    ? `<div class="confirm-bar"><button type="button" id="btn-confirm-mission" class="primary">この工事を確定（${escapeHtml(state.pendingMissionNumber)}）</button><button type="button" id="btn-clear-pending" class="secondary">選び直す</button></div>`
    : "";

  app.innerHTML = `<section class="panel">
    <p class="section-title">チームを選ぶ</p>
    <div class="team-strip">${ranking.map(t => renderTeamCard(t, t.index === selectedIndex)).join("")}</div>
    <div class="selected-panel">${selectedPanelHtml}</div>
    <p class="section-title">${escapeHtml(project.label)} ミッション一覧</p>
    <div class="mission-grid">${missionCardsHtml}</div>
    ${confirmBarHtml}
  </section>`;

  app.querySelectorAll("[data-team]").forEach(card => {
    const selectTeam = () => {
      const idx = Number(card.dataset.team);
      state.selectedTeamIndex = state.selectedTeamIndex === idx ? null : idx;
      state.pendingMissionNumber = null;
      saveState(); render();
    };
    card.onclick = selectTeam;
    card.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectTeam(); } };
  });
  app.querySelectorAll("[data-rename]").forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); promptRenameTeam(Number(btn.dataset.rename)); };
  });
  const cancelResBtn = document.getElementById("btn-cancel-resolution");
  if (cancelResBtn) cancelResBtn.onclick = () => { cancelProjectResolution(selectedIndex, projectKey); saveState(); render(); };
  const passBtn = document.getElementById("btn-pass");
  if (passBtn) passBtn.onclick = () => { passProject(selectedIndex, projectKey); saveState(); render(); };
  app.querySelectorAll("[data-quiz]").forEach(btn => {
    btn.onclick = () => openQuizConfirm(selectedIndex, Number(btn.dataset.quiz));
  });
  app.querySelectorAll("[data-manual]").forEach(btn => {
    btn.onclick = () => { applyManualAdjust(selectedIndex, Number(btn.dataset.manual)); saveState(); render(); };
  });
  app.querySelectorAll("[data-pick-mission]").forEach(el => {
    const pick = () => { state.pendingMissionNumber = el.dataset.pickMission; saveState(); render(); };
    el.onclick = pick;
    el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } };
  });
  app.querySelectorAll("[data-cancel-mission]").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const ownerIndex = state.missionOwners[projectKey][btn.dataset.cancelMission];
      if (ownerIndex === null || ownerIndex === undefined) return;
      cancelProjectResolution(ownerIndex, projectKey);
      saveState(); render();
    };
  });
  const confirmBtn = document.getElementById("btn-confirm-mission");
  if (confirmBtn) confirmBtn.onclick = () => { confirmMission(selectedIndex, projectKey, state.pendingMissionNumber); saveState(); render(); };
  const clearBtn = document.getElementById("btn-clear-pending");
  if (clearBtn) clearBtn.onclick = () => { state.pendingMissionNumber = null; saveState(); render(); };
}

function renderHistoryList(teamIndex) {
  const entries = getTeamHistory(teamIndex);
  if (entries.length === 0) return `<p class="hint">まだ履歴はありません。</p>`;
  return `<ul class="history-list">${entries.map(h => `<li><span>${formatTime(h.time)}｜${escapeHtml(CATEGORY_LABELS[h.project] || h.project)}｜${escapeHtml(h.label)}</span><span>${formatDelta(h.amount)}</span></li>`).join("")}</ul>`;
}
function renderFinalView() {
  const ranking = computeRanking();
  const breakdownHtml = ranking.map(t => {
    const p1 = getTeamCategoryTotal(t.index, "1");
    const p2 = getTeamCategoryTotal(t.index, "2");
    const p3 = getTeamCategoryTotal(t.index, "3");
    const quiz = getTeamCategoryTotal(t.index, "quiz");
    const manual = getTeamCategoryTotal(t.index, "manual");
    const bonus = getTeamCategoryTotal(t.index, "bonus");
    return `<div class="breakdown-card">
      <h3><span class="${swatchClass(t.color, "swatch")}" style="background:${t.color}"></span>${escapeHtml(t.name)}</h3>
      <div class="breakdown-row"><span>PROJECT1</span><span>${formatDelta(p1)}</span></div>
      <div class="breakdown-row"><span>PROJECT2</span><span>${formatDelta(p2)}</span></div>
      <div class="breakdown-row"><span>PROJECT3</span><span>${formatDelta(p3)}</span></div>
      <div class="breakdown-row"><span>追加クイズ</span><span>${formatDelta(quiz)}</span></div>
      ${manual !== 0 ? `<div class="breakdown-row"><span>手動調整</span><span>${formatDelta(manual)}</span></div>` : ""}
      <div class="breakdown-row"><span>地域貢献ボーナス</span><span>${formatDelta(bonus)}</span></div>
      <div class="breakdown-row total"><span>合計</span><span>${formatTotal(t.total)}</span></div>
      <button type="button" class="history-toggle" data-history-toggle="${t.index}">履歴を見る</button>
      <div class="history-body" id="history-${t.index}" hidden>${renderHistoryList(t.index)}</div>
    </div>`;
  }).join("");

  const bonusRevealHtml = state.bonusAnnounced ? `<div class="bonus-reveal">
    <h3>地域貢献ボーナス！</h3>
    ${state.bonusEligibleTeams.length === 0 ? "<p>対象チームはありません。</p>" : `<ul>${state.bonusEligibleTeams.map(i => `<li>${escapeHtml(state.teamNames[i])}</li>`).join("")}</ul>`}
    <p>＋${state.bonusAmount}万円！</p>
  </div>` : "";

  app.innerHTML = `<section class="panel">
    <p class="section-title">チーム別 獲得報酬の内訳</p>
    <div class="breakdown-grid">${breakdownHtml}</div>

    <div class="bonus-section">
      <p class="section-title">地域貢献ボーナス${state.bonusGranted ? '<span class="bonus-granted-tag">加算済み</span>' : ""}</p>
      <div class="bonus-amount-row">
        <label for="bonus-amount">ボーナス金額</label>
        <input type="number" id="bonus-amount" value="${state.bonusAmount}" step="50" ${state.bonusGranted ? "disabled" : ""}>
        <span>万円</span>
      </div>
      <div class="button-row">
        <button type="button" id="btn-announce-bonus" class="primary">地域貢献ボーナスを発表</button>
        <button type="button" id="btn-grant-bonus" class="primary" ${(!state.bonusAnnounced || state.bonusGranted) ? "disabled" : ""}>ボーナスを加算</button>
        <button type="button" id="btn-cancel-bonus" class="secondary danger" ${state.bonusGranted ? "" : "disabled"}>ボーナス取消</button>
      </div>
      ${bonusRevealHtml}
    </div>

    <div class="final-actions">
      <button type="button" id="btn-show-final-ranking" class="primary">最終ランキングを表示</button>
    </div>
  </section>`;

  app.querySelectorAll("[data-history-toggle]").forEach(btn => {
    btn.onclick = () => {
      const body = document.getElementById(`history-${btn.dataset.historyToggle}`);
      body.hidden = !body.hidden;
      btn.textContent = body.hidden ? "履歴を見る" : "履歴を閉じる";
    };
  });
  const amountInput = document.getElementById("bonus-amount");
  amountInput.onchange = () => {
    const v = Number(amountInput.value);
    state.bonusAmount = Number.isFinite(v) ? v : CONFIG.defaultBonusAmount;
    saveState(); render();
  };
  document.getElementById("btn-announce-bonus").onclick = () => { announceBonus(); saveState(); render(); };
  document.getElementById("btn-grant-bonus").onclick = () => openBonusGrantConfirm();
  document.getElementById("btn-cancel-bonus").onclick = () => openBonusCancelConfirm();
  document.getElementById("btn-show-final-ranking").onclick = () => showProjector("災害復旧・まちづくりゲーム 最終結果", "");
}

function render() {
  renderTabs();
  if (state.currentProject === "final") renderFinalView();
  else renderProjectView(state.currentProject);
}

// ----- プロジェクター画面（ランキング表示・最終結果） -----
function showProjector(title, subtitle) {
  const ranking = computeRanking();
  projectorEl.innerHTML = `<h1 tabindex="-1">${escapeHtml(title)}</h1>${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
    <ol class="projector-list">${ranking.map(t => `<li class="projector-row"><span class="projector-rank">${t.rank}位</span><span class="projector-team"><span class="projector-swatch${isLightColor(t.color) ? " light" : ""}" style="background:${t.color}"></span>${escapeHtml(t.name)}</span><span class="projector-amount">${formatTotal(t.total)}</span></li>`).join("")}</ol>
    <button type="button" class="projector-back" id="btn-projector-back">管理画面へ戻る</button>`;
  projectorEl.hidden = false;
  document.getElementById("btn-projector-back").onclick = hideProjector;
  projectorEl.querySelector("h1")?.focus({ preventScroll: true });
}
function hideProjector() {
  projectorEl.hidden = true;
  projectorEl.innerHTML = "";
}

// ----- ダイアログ -----
const resetDialog = document.getElementById("reset-dialog");
const quizDialog = document.getElementById("quiz-confirm-dialog");
const bonusGrantDialog = document.getElementById("bonus-grant-dialog");
const bonusCancelDialog = document.getElementById("bonus-cancel-dialog");
let pendingQuiz = null;

function openQuizConfirm(teamIndex, cost) {
  pendingQuiz = { teamIndex, cost };
  document.getElementById("quiz-confirm-body").textContent = `${state.teamNames[teamIndex]} から ${cost}万円を減額します。よろしいですか？`;
  quizDialog.showModal();
}
document.getElementById("cancel-quiz").onclick = () => { pendingQuiz = null; quizDialog.close(); };
document.getElementById("confirm-quiz").onclick = () => {
  if (pendingQuiz) { applyQuizCost(pendingQuiz.teamIndex, pendingQuiz.cost); saveState(); }
  pendingQuiz = null;
  quizDialog.close();
  render();
};

function openBonusGrantConfirm() {
  document.getElementById("bonus-grant-body").textContent = `対象チーム（${state.bonusEligibleTeams.map(i => state.teamNames[i]).join("、") || "なし"}）に、それぞれ${state.bonusAmount}万円を加算します。よろしいですか？`;
  bonusGrantDialog.showModal();
}
document.getElementById("cancel-bonus-grant").onclick = () => bonusGrantDialog.close();
document.getElementById("confirm-bonus-grant").onclick = () => {
  grantBonus(); saveState(); bonusGrantDialog.close(); render();
};

function openBonusCancelConfirm() { bonusCancelDialog.showModal(); }
document.getElementById("cancel-bonus-cancel").onclick = () => bonusCancelDialog.close();
document.getElementById("confirm-bonus-cancel").onclick = () => {
  cancelBonus(); saveState(); bonusCancelDialog.close(); render();
};

document.getElementById("btn-ranking").onclick = () => showProjector("現在のランキング", "");
document.getElementById("btn-undo").onclick = () => { undoLast(); saveState(); render(); };
document.getElementById("btn-reset").onclick = () => resetDialog.showModal();
document.getElementById("cancel-reset").onclick = () => resetDialog.close();
document.getElementById("confirm-reset").onclick = () => {
  const keepNames = state.teamNames.slice();
  state = freshState();
  state.teamNames = keepNames;
  saveState();
  resetDialog.close();
  hideProjector();
  render();
};

saveState(); // 開始前に保存可否を確認
render();
