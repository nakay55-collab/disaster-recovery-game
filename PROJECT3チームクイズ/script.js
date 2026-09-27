"use strict";

// ===== 編集用設定：問題・時間・カード配布枚数はここで変更できます =====
const CONFIG = {
  durationSeconds: 4 * 60,
  storageKey: "project3-team-quiz-v1", // 問題構成を変えた場合はバージョンを変更
  adminParam: "admin",
  adminValue: "1", // ?admin=1 で管理者用リセットを表示（認証ではありません）
};
// type: "single"（1つだけ選ぶ、correctは選択肢の番号）／"multi"（複数選ぶ、correctは正解の番号の配列）
// 選択肢の番号：A=0、B=1、C=2、D=3
const QUESTIONS = [
  {
    type: "single",
    text: "2本の道路があります。\n\n道路A：\n報酬550万円\n病院・学校・住宅地・避難所につながっている\n\n道路B：\n報酬850万円\n主に工業地域につながっている\n\nどちらを先に復旧するか判断するために、さらに確認したい情報として最も適切なのは？",
    options: ["道路を利用する人数、緊急車両への影響、迂回路の有無", "道路の名前の長さ", "使用する重機のメーカー", "工事看板の枚数"],
    correct: 0,
    explanation: "報酬だけでなく、その道路を使う人数、緊急性、迂回路の有無などを見ることで、町全体への影響を判断できます。",
  },
  {
    type: "single",
    text: "次の2つの工事があります。\n\n工事①：\n報酬800万円\n必要な重機カードが1枚不足\n\n工事②：\n報酬650万円\n現在のカードで施工可能\n\n最も適切な判断は？",
    options: ["必ず工事①を選ぶ", "必ず工事②を選ぶ", "不足カードを得るための費用、安全性、成功時の報酬を比較して決める", "報酬額は考えず、近い現場を選ぶ"],
    correct: 2,
    explanation: "高い報酬だけでなく、追加費用、安全性、必要なカードなども合わせて考えることが大切です。",
  },
  {
    type: "multi",
    text: "主要道路の復旧現場を選ぶとき、判断材料として大切なものを3つ選んでください。",
    options: ["工事の報酬や必要な費用", "道路が病院・学校・避難所など、どこにつながっているか", "手持ちの人員・重機で安全に施工できるか", "道路番号が大きいか小さいか"],
    correct: [0, 1, 2],
    explanation: "工事選択では、会社としての採算、安全に施工できるか、地域への影響を合わせて考えます。",
  },
  {
    type: "single",
    text: "次の文章は正しいか間違っているか？\n\n「報酬が低い工事でも、多くの住民の生活や救急・避難に大きく関係する道路であれば、復旧を優先する合理的な理由になり得る。」",
    options: ["○", "×"],
    correct: 0,
    explanation: "報酬が低くても、救急・避難・通学など多くの人に影響する道路なら優先する理由になります。",
  },
  {
    type: "single",
    text: "道路復旧工事で、次の状況になっています。\n\n・工期が遅れている\n・重機が稼働している\n・仕上がりの品質確認が必要\n・周辺住民への安全配慮が必要\n\n施工管理をする人の対応として最も適切なのは？",
    options: ["工期だけを優先する", "安全だけを考え、品質や工期は考えない", "工程・安全・品質などを確認しながら、現場全体を調整する", "すべて重機オペレーターに任せる"],
    correct: 2,
    explanation: "施工管理は、工程だけでなく安全や品質なども確認しながら、現場全体を調整する役割です。",
  },
];
// 選べるカードの種類（結果画面に表示するだけで、在庫管理はしません）
const PEOPLE_CARD_TYPES = ["重機オペレーター", "現場リーダー", "地域サポート"];
const HEAVY_CARD_TYPES = ["バックホウ", "ミニショベル", "ダンプトラック", "ロードローラー", "クレーン"];
// 正解数ごとの「好きなカード」獲得枚数。minCorrect（最低正解数）の大きい順に並べます。
const CARD_TIERS = [
  { minCorrect: 5, cards: 4, message: "パーフェクト！\n好きなカードを4枚選べます。" },
  { minCorrect: 4, cards: 3 },
  { minCorrect: 2, cards: 2 },
  { minCorrect: 0, cards: 1 },
];
// ===== 以下は画面・進行処理 =====
const app = document.getElementById("app");
const dialog = document.getElementById("finish-dialog");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const formatQuestionText = (text) => escapeHtml(text).replace(/\n/g, "<br>");
const freshState = () => ({ status: "ready", answers: Array(QUESTIONS.length).fill(null), index: 0, deadline: null, timedOut: false });
function hasAnswer(value) { return value !== null && !(Array.isArray(value) && value.length === 0); }
function isCorrect(question, answer) {
  if (question.type === "multi") {
    if (!Array.isArray(answer)) return false;
    const given = [...new Set(answer)].sort((a, b) => a - b);
    const correct = [...question.correct].sort((a, b) => a - b);
    return given.length === correct.length && given.every((v, i) => v === correct[i]);
  }
  return answer === question.correct;
}
const grade = answers => QUESTIONS.reduce((sum, q, i) => sum + Number(isCorrect(q, answers[i])), 0);
const chooseTier = score => CARD_TIERS.find(tier => score >= tier.minCorrect);
function answerLetters(answer) {
  if (!hasAnswer(answer)) return "未回答";
  const list = Array.isArray(answer) ? answer : [answer];
  return list.slice().sort((a, b) => a - b).map(i => String.fromCharCode(65 + i)).join("・");
}
function correctSummary(question) {
  const indices = question.type === "multi" ? question.correct : [question.correct];
  return indices.map(i => `${String.fromCharCode(65 + i)}. ${escapeHtml(question.options[i])}`).join("／");
}
let state = freshState();
let timerId;
let storageBroken = false;

function storageWarning() {
  storageBroken = true;
  document.getElementById("storage-warning").hidden = false;
}
function validAnswerValue(question, value) {
  if (value === null) return true;
  if (question.type === "multi") {
    return Array.isArray(value) && value.every(v => Number.isInteger(v) && v >= 0 && v < question.options.length);
  }
  return Number.isInteger(value) && value >= 0 && value < question.options.length;
}
function validState(s) {
  return s && ["ready", "active", "finished"].includes(s.status)
    && Array.isArray(s.answers) && s.answers.length === QUESTIONS.length
    && s.answers.every((a, i) => validAnswerValue(QUESTIONS[i], a))
    && Number.isInteger(s.index) && s.index >= 0 && s.index < QUESTIONS.length
    && (s.status === "ready" || (Number.isFinite(s.deadline) && s.deadline > 0))
    && typeof s.timedOut === "boolean";
}
function readState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!validState(saved)) throw new Error("Invalid saved quiz");
    return saved;
  } catch { storageWarning(); return null; }
}
function saveState() {
  try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); }
  catch { storageWarning(); }
}
function remainingSeconds() { return Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000)); }
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function focusHeading() {
  const heading = app.querySelector("h1, h2");
  heading?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderStart() {
  const minutes = CONFIG.durationSeconds / 60;
  app.innerHTML = `<section class="panel"><p class="eyebrow">FINAL STAGE - PROJECT3</p><div class="hero-art" aria-hidden="true"></div><h1 tabindex="-1">PROJECT3 チームクイズ</h1><p class="intro">いよいよ最終ステージ！<br>町全体を見ながら、チームで考えて答えよう。</p><div class="facts"><div class="fact">全<strong>${QUESTIONS.length}</strong>問</div><div class="fact">制限時間<strong>${minutes}</strong>分</div><div class="fact">チームで<strong>相談OK</strong></div><div class="fact">正解数で<strong>カード獲得</strong></div></div><button id="start" class="primary wide" type="button">クイズスタート <span aria-hidden="true">→</span></button><p class="small">1つの答えをチームで話し合って決めてください。回答中は前の問題に戻れます。終了後のやり直しはできません。</p></section>`;
  document.getElementById("start").onclick = () => {
    const saved = readState();
    if (saved && saved.status !== "ready") { state = saved; render(); return; }
    state = freshState();
    state.status = "active";
    state.deadline = Date.now() + CONFIG.durationSeconds * 1000;
    saveState(); render(); focusHeading();
  };
}
// 操作直前にも期限と他タブの終了状態を確認します。
function canAnswer() {
  const saved = readState();
  if (saved?.status === "finished") { state = saved; render(); return false; }
  if (state.status !== "active") return false;
  if (Date.now() >= state.deadline) { finish(true); return false; }
  return true;
}
function renderQuestion() {
  const q = QUESTIONS[state.index];
  const current = state.answers[state.index];
  const isSelected = i => q.type === "multi" ? Array.isArray(current) && current.includes(i) : current === i;
  const hint = q.type === "multi" ? "チームで相談して、当てはまるものをすべて選んでください" : "チームで相談して1つ選んでください";
  app.innerHTML = `<div class="status"><div class="status-row"><div class="count">${state.index + 1} / ${QUESTIONS.length}<span> 問目</span></div><div id="timer" class="timer" role="timer" aria-live="off"><span>残り時間</span><strong id="time"></strong></div></div><progress value="${state.index + 1}" max="${QUESTIONS.length}" aria-label="現在の問題 ${state.index + 1} / ${QUESTIONS.length}"></progress></div><section class="panel"><p class="question-label">QUESTION ${String(state.index + 1).padStart(2, "0")}</p><p class="team-hint">${hint}</p><h2 id="question" tabindex="-1">${formatQuestionText(q.text)}</h2><div class="options" role="group" aria-labelledby="question">${q.options.map((option, i) => `<button type="button" class="option" data-answer="${i}" aria-pressed="${isSelected(i)}"><span class="letter">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(option)}</span><span class="selected-mark" aria-hidden="true">${isSelected(i) ? "✓" : ""}</span></button>`).join("")}</div><p id="error" class="error" role="alert"></p><div class="navigation"><button id="back" type="button" class="secondary" ${state.index === 0 ? "disabled" : ""}>戻る</button><button id="next" type="button" class="primary">${state.index === QUESTIONS.length - 1 ? "回答を終了する" : "次へ →"}</button></div></section>`;
  app.querySelectorAll("[data-answer]").forEach(button => {
    button.onclick = () => {
      if (!canAnswer()) return;
      const i = Number(button.dataset.answer);
      if (q.type === "multi") {
        const set = new Set(Array.isArray(state.answers[state.index]) ? state.answers[state.index] : []);
        if (set.has(i)) set.delete(i); else set.add(i);
        state.answers[state.index] = [...set].sort((a, b) => a - b);
      } else {
        state.answers[state.index] = i;
      }
      saveState();
      const value = state.answers[state.index];
      app.querySelectorAll("[data-answer]").forEach(b => {
        const selected = q.type === "multi" ? value.includes(Number(b.dataset.answer)) : Number(b.dataset.answer) === value;
        b.setAttribute("aria-pressed", String(selected));
        b.querySelector(".selected-mark").textContent = selected ? "✓" : "";
      });
      document.getElementById("error").textContent = "";
    };
  });
  document.getElementById("back").onclick = () => {
    if (!canAnswer() || state.index === 0) return;
    state.index--; saveState(); render(); focusHeading();
  };
  document.getElementById("next").onclick = () => {
    if (!canAnswer()) return;
    if (!hasAnswer(state.answers[state.index])) {
      document.getElementById("error").textContent = "回答を選んでください"; return;
    }
    if (state.index < QUESTIONS.length - 1) {
      state.index++; saveState(); render(); focusHeading();
    } else {
      const missing = state.answers.findIndex(a => !hasAnswer(a));
      if (missing !== -1) { state.index = missing; saveState(); render(); focusHeading(); return; }
      dialog.showModal();
      document.getElementById("cancel-finish").focus();
    }
  };
  updateTimer();
}
function updateTimer() {
  if (state.status !== "active") return;
  const seconds = remainingSeconds();
  if (seconds === 0) { finish(true); return; }
  const element = document.getElementById("timer");
  if (!element) return;
  document.getElementById("time").textContent = formatTime(seconds);
  element.className = `timer${seconds <= 10 ? " critical" : seconds <= 60 ? " warning" : ""}`;
}
function finish(timedOut) {
  if (state.status !== "active") return;
  state.status = "finished";
  state.timedOut = timedOut;
  saveState();
  if (dialog.open) dialog.close();
  render(); focusHeading();
}
function renderResult() {
  if (dialog.open) dialog.close();
  const score = grade(state.answers);
  const tier = chooseTier(score);
  const isPerfect = score === QUESTIONS.length;
  const answerReview = QUESTIONS.map((q, i) => {
    const correct = isCorrect(q, state.answers[i]);
    return `<div class="explanation ${correct ? "is-correct" : "is-wrong"}"><p class="explanation-q"><strong>Q${i + 1}</strong><span class="result-tag">${correct ? "正解" : "不正解"}</span></p><p class="explanation-text">${formatQuestionText(q.text)}</p><p class="explanation-answer">チームの回答：${answerLetters(state.answers[i])}</p><p class="explanation-correct">正解：${correctSummary(q)}</p><p class="explanation-note">${escapeHtml(q.explanation)}</p></div>`;
  }).join("");
  app.innerHTML = `<section class="panel result"><p class="eyebrow">QUIZ RESULT</p>${state.timedOut ? '<div class="timeout">TIME OUT</div><p class="small">制限時間になりました。未回答の問題は不正解として採点しました。</p>' : '<p class="small">回答が終了しました。おつかれさまでした！</p>'}<h1 class="score" tabindex="-1">${QUESTIONS.length}問中 <strong>${score}</strong>問正解</h1>${tier.message ? `<p class="congrats">${escapeHtml(tier.message)}</p>` : ""}<div class="set-box${isPerfect ? " is-perfect" : ""}"><p class="cards-title">獲得カード</p><ul class="cards"><li><span>好きなカード</span><span>${tier.cards}枚</span></li></ul></div><p class="small">獲得した枚数分、下から好きなカードを選んでスタッフから受け取ってください。</p><div class="card-types"><p class="cards-title">選べるカード</p><p class="type-group-label">【人カード】</p><ul class="type-list">${PEOPLE_CARD_TYPES.map(name => `<li>${escapeHtml(name)}</li>`).join("")}</ul><p class="type-group-label">【重機カード】</p><ul class="type-list">${HEAVY_CARD_TYPES.map(name => `<li>${escapeHtml(name)}</li>`).join("")}</ul><p class="small">同じ種類のカードは、今回の配布では最大2枚まで</p></div><p class="handoff">画面をスタッフに見せて<br>カードを受け取ってください</p><p id="reload-note" class="small">この画面をスタッフに見せてください。<br>再読み込みしても結果を表示します。</p><details><summary>答えを見る</summary>${answerReview}</details></section>`;
  if (storageBroken) document.getElementById("reload-note").textContent = "この画面をスタッフに見せてください。保存できないため、ページを閉じずにお持ちください。";
}
function render() {
  clearInterval(timerId);
  if (state.status === "ready") renderStart();
  else if (state.status === "finished") renderResult();
  else {
    if (Date.now() >= state.deadline) { finish(true); return; }
    renderQuestion();
    timerId = setInterval(updateTimer, 200);
  }
}
document.getElementById("cancel-finish").onclick = () => dialog.close();
document.getElementById("confirm-finish").onclick = () => {
  if (canAnswer() && state.answers.every(a => hasAnswer(a))) finish(false);
};
const isAdmin = new URLSearchParams(location.search).get(CONFIG.adminParam) === CONFIG.adminValue;
document.getElementById("admin").hidden = !isAdmin;
document.getElementById("reset").onclick = () => {
  if (!isAdmin || !window.confirm("保存された回答と結果を削除し、最初からやり直しますか？")) return;
  if (dialog.open) dialog.close();
  state = freshState(); saveState(); render(); focusHeading();
};
function syncState() {
  const saved = readState();
  if (saved) state = saved;
  render();
}
window.addEventListener("storage", event => { if (event.key === CONFIG.storageKey) syncState(); });
window.addEventListener("pageshow", syncState);
document.addEventListener("visibilitychange", () => { if (!document.hidden) syncState(); });
state = readState() || freshState();
saveState(); // 開始前に保存可否を確認
render();
