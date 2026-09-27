"use strict";

// ===== 編集用設定：問題・時間・カード判定はここで変更できます =====
const CONFIG = {
  durationSeconds: 8 * 60,
  storageKey: "initial-civil-quiz-v3", // 問題構成を変えた場合はバージョンを変更
  adminParam: "admin",
  adminValue: "1", // ?admin=1 で管理者用リセットを表示（認証ではありません）
};
// 参加者が選べる問題数。
const COURSE_OPTIONS = [10, 13];
// correct は選択肢の番号：A=0、B=1、C=2、D=3
// 13問すべてをここに1つの配列として持ち、10問版は下のTEN_QUESTION_IDSで抽出します（重複記載しません）。
const QUESTIONS = [
  { text: "台風で道路に土砂が流れ込みました。\n\n土砂を掘り、すくい、ダンプトラックへ積み込む作業に最も適しているものは？", options: ["ロードローラー", "バックホウ", "ダンプトラック", "クレーン"], correct: 1 },
  { text: "道路に大量の土砂があります。\n\n土砂を掘って、そのあと現場から運び出す場合、最も適した組み合わせは？", options: ["バックホウ＋ダンプトラック", "ロードローラー＋クレーン", "ミニショベル＋ロードローラー", "クレーン＋ロードローラー"], correct: 0 },
  { text: "建設機械を仕事で操作するときの説明として、最も適切なのは？", options: ["普通自動車免許があれば、すべての建設機械を操作できる", "自動車を道路で運転する免許と、作業現場で建設機械を操作するための資格・教育は別に考える", "私有地であれば資格や教育は必要ない", "現場責任者が許可すれば誰でも操作できる"], correct: 1 },
  { text: "機体重量2.8tの小型油圧ショベルを、仕事で掘削作業に使用します。\n\n必要なものとして最も適切なのは？", options: ["普通自動車免許だけ", "小型車両系建設機械の特別教育", "車両系建設機械運転技能講習が必ず必要", "施工管理技士"], correct: 1, explanation: "機体重量3t未満の小型車両系建設機械は、該当する特別教育の対象となります。" },
  { text: "機体重量3.2tの油圧ショベルを、仕事で掘削作業に使用します。\n\n最も適切なのは？", options: ["小型車両系建設機械の特別教育だけ", "車両系建設機械運転技能講習", "普通自動車免許だけ", "ローラーの特別教育"], correct: 1, explanation: "機体重量3t以上の整地・運搬・積込み・掘削用の車両系建設機械は、技能講習の対象となります。" },
  { text: "車両系建設機械の技能講習を修了している人が、道路工事でロードローラーを運転しようとしています。\n\n最も適切な考え方は？", options: ["車両系建設機械の技能講習があれば、そのままローラーも運転できる", "ローラーの運転に必要な特別教育について確認する", "普通自動車免許があれば特別教育は必要ない", "災害復旧なら教育は必要ない"], correct: 1 },
  { text: "災害復旧現場に到着しました。\n\n道路には土砂があり、そのすぐ横を住民が歩いています。\n\n重機を動かす前に、最も優先して確認することは？", options: ["工事の報酬", "使用する重機のメーカー", "現場状況と周囲の人の安全", "ダンプトラックの台数だけ"], correct: 2 },
  { text: "バックホウで作業しているとき、作業員がバケットの動く範囲に近づいてきました。\n\n最も適切な対応は？", options: ["オペレーターから見えていれば作業を続ける", "作業速度を遅くすれば作業を続けられる", "一度作業を止め、安全な場所へ移動してもらってから再開する", "クラクションを鳴らしてそのまま続ける"], correct: 2 },
  { text: "道路に大量の土砂があります。\n\nバックホウはありますが、土砂を運び出すダンプトラックがありません。\n\n現場全体を考えた対応として最も適切なのは？", options: ["とりあえず全部掘り始める", "土砂の搬出方法や仮置き場所なども確認して作業計画を立てる", "ロードローラーで土砂を押し固める", "道路脇へ土砂を寄せれば工事完了とする"], correct: 1 },
  { text: "土砂を撤去し、道路を平らにしました。\n\nしかし、そのまま車を通すと路面が沈む可能性があります。\n\n次に考える作業として最も適切なのは？", options: ["締固め", "さらに深く掘る", "倒木撤去", "クレーン作業"], correct: 0 },
  { text: "施工管理をする人の仕事として最も近いものは？", options: ["重機を運転することだけ", "工程・品質・安全などを確認しながら現場全体を調整する", "土砂を運ぶことだけ", "工事の報酬だけを決める"], correct: 1 },
  { text: "2つの工事があります。\n\nA工事：\n報酬800万円\n必要な重機が1台不足\n周辺には多くの住民がいる\n\nB工事：\n報酬650万円\n現在持っている人員・重機で施工できる\n\n会社として最も適切な考え方は？", options: ["報酬が高いA工事を必ず選ぶ", "確実にできるB工事を必ず選ぶ", "追加費用、安全、必要な重機、地域への影響、報酬を比較して判断する", "報酬は考えず地域への影響だけを見る"], correct: 2 },
  { text: "2本の道路があります。\n\n道路A：\n報酬500万円\n学校・病院・住宅地・避難所につながっている\n\n道路B：\n報酬800万円\n主に工業地域につながっている\n\nどちらを先に復旧するか判断するために、さらに確認したい情報として最も適切なのは？", options: ["道路の名前", "使用する重機のメーカー", "利用者数、緊急車両への影響、迂回路、工事費など", "道路番号"], correct: 2 },
];
// 10問版で出題するQUESTIONSの番号（1始まり）。ここを変更すれば10問版の出題を入れ替えられます。
const TEN_QUESTION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12];
// カードセット判定。10問版・13問版とも同じ基準を使います（10問版は13点満点に換算してから判定）。
// minCorrect（最低正解数、または換算点）の大きい順に並べます。
const CARD_SETS = [
  { name: "A", minCorrect: 11, cards: [["重機オペレーター", 3], ["現場リーダー", 1]] },
  { name: "B", minCorrect: 8, cards: [["重機オペレーター", 2], ["現場リーダー", 1], ["地域サポート", 1]] },
  { name: "C", minCorrect: 5, cards: [["重機オペレーター", 1], ["現場リーダー", 1], ["地域サポート", 1], ["救済カード", 1]] },
  { name: "D", minCorrect: 0, cards: [["重機オペレーター", 1], ["地域サポート", 3]] },
];
// ===== 以下は画面・進行処理 =====
const app = document.getElementById("app");
const dialog = document.getElementById("finish-dialog");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const formatQuestionText = (text) => escapeHtml(text).replace(/\n/g, "<br>");
function questionsForCourse(courseLength) {
  if (courseLength === 13) return QUESTIONS;
  if (courseLength === 10) return TEN_QUESTION_IDS.map(id => QUESTIONS[id - 1]);
  return [];
}
const activeQuestions = () => questionsForCourse(state.courseLength);
const freshState = () => ({ status: "ready", courseLength: null, answers: [], index: 0, deadline: null, timedOut: false });
const grade = (answers, questions) => answers.reduce((sum, answer, i) => sum + Number(answer === questions[i].correct), 0);
// 10問版は正解数を13点満点相当に換算し、13問版と同じ基準で判定します（四捨五入しません）。
function judgingScore(rawScore, courseLength) {
  return courseLength === 10 ? (rawScore / 10) * 13 : rawScore;
}
const chooseSet = score => CARD_SETS.find(set => score >= set.minCorrect);
let state = freshState();
let timerId;
let storageBroken = false;

function storageWarning() {
  storageBroken = true;
  document.getElementById("storage-warning").hidden = false;
}
function validState(s) {
  if (!s || !["ready", "active", "finished"].includes(s.status)) return false;
  if (s.status === "ready") {
    return s.courseLength === null && Array.isArray(s.answers) && s.answers.length === 0 && s.index === 0;
  }
  if (!COURSE_OPTIONS.includes(s.courseLength)) return false;
  const questions = questionsForCourse(s.courseLength);
  return Array.isArray(s.answers) && s.answers.length === questions.length
    && s.answers.every((a, i) => a === null || (Number.isInteger(a) && a >= 0 && a < questions[i].options.length))
    && Number.isInteger(s.index) && s.index >= 0 && s.index < questions.length
    && Number.isFinite(s.deadline) && s.deadline > 0
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
  let selected = null;
  app.innerHTML = `<section class="panel"><p class="eyebrow">READY TO BUILD OUR TOWN</p><div class="hero-art" aria-hidden="true"><i class="building"></i><i class="building"></i><i class="building"></i><i class="building"></i></div><h1 tabindex="-1">災害復旧チャレンジクイズ</h1><p class="intro">全体の制限時間は${minutes}分です。<br>問題数を選んで挑戦してください。</p><div class="course-choice" role="group" aria-label="問題数を選択">${COURSE_OPTIONS.map(n => `<button type="button" class="course-button" data-course="${n}" aria-pressed="false">${n}問に挑戦</button>`).join("")}</div><button id="start" class="primary wide" type="button" disabled>クイズスタート</button><p class="small">正解数に応じて、ゲームで使うカードセットが決まります。回答中は前の問題に戻れます。終了後のやり直しはできません。</p></section>`;
  const startButton = document.getElementById("start");
  app.querySelectorAll("[data-course]").forEach(button => {
    button.onclick = () => {
      selected = Number(button.dataset.course);
      app.querySelectorAll("[data-course]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
      startButton.disabled = false;
    };
  });
  startButton.onclick = () => {
    if (!selected) return;
    const saved = readState();
    if (saved && saved.status !== "ready") { state = saved; render(); return; }
    state = freshState();
    state.status = "active";
    state.courseLength = selected;
    state.answers = Array(selected).fill(null);
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
  const questions = activeQuestions();
  const q = questions[state.index];
  app.innerHTML = `<div class="status"><div class="status-row"><div class="count">${state.index + 1} / ${questions.length}<span> 問目</span></div><div id="timer" class="timer" role="timer" aria-live="off"><span>残り時間</span><strong id="time"></strong></div></div><progress value="${state.index + 1}" max="${questions.length}" aria-label="現在の問題 ${state.index + 1} / ${questions.length}"></progress></div><section class="panel"><p class="question-label">QUESTION ${String(state.index + 1).padStart(2, "0")}</p><h2 id="question" tabindex="-1">${formatQuestionText(q.text)}</h2><div class="options" role="group" aria-labelledby="question">${q.options.map((option, i) => `<button type="button" class="option" data-answer="${i}" aria-pressed="${state.answers[state.index] === i}"><span class="letter">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(option)}</span><span class="selected-mark" aria-hidden="true">${state.answers[state.index] === i ? "✓" : ""}</span></button>`).join("")}</div><p id="error" class="error" role="alert"></p><div class="navigation"><button id="back" type="button" class="secondary" ${state.index === 0 ? "disabled" : ""}>戻る</button><button id="next" type="button" class="primary">${state.index === questions.length - 1 ? "回答を終了する" : "次へ →"}</button></div></section>`;
  app.querySelectorAll("[data-answer]").forEach(button => {
    button.onclick = () => {
      if (!canAnswer()) return;
      state.answers[state.index] = Number(button.dataset.answer);
      saveState();
      app.querySelectorAll("[data-answer]").forEach(b => {
        const selected = Number(b.dataset.answer) === state.answers[state.index];
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
    if (state.answers[state.index] === null) {
      document.getElementById("error").textContent = "回答を選んでください"; return;
    }
    if (state.index < questions.length - 1) {
      state.index++; saveState(); render(); focusHeading();
    } else {
      const missing = state.answers.indexOf(null);
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
  const questions = activeQuestions();
  const rawScore = grade(state.answers, questions);
  const set = chooseSet(judgingScore(rawScore, state.courseLength));
  const answerReview = questions.map((q, i) => `<p class="explanation"><strong>Q${i + 1}：正解 ${String.fromCharCode(65 + q.correct)}. ${escapeHtml(q.options[q.correct])}</strong>${q.explanation ? `<br>${escapeHtml(q.explanation)}` : ""}</p>`).join("");
  app.innerHTML = `<section class="panel result"><p class="eyebrow">QUIZ RESULT</p>${state.timedOut ? '<div class="timeout">TIME OUT</div><p class="small">制限時間になりました。未回答の問題は不正解として採点しました。</p>' : '<p class="small">回答が終了しました。おつかれさまでした！</p>'}<h1 class="score" tabindex="-1">${questions.length}問中 <strong>${rawScore}</strong>問正解</h1><div class="set-box"><p class="set-name">あなたは <strong>${escapeHtml(set.name)}セット</strong>です</p><p class="cards-title">受け取るカード</p><ul class="cards">${set.cards.map(([name, count]) => `<li><span>${escapeHtml(name)}</span><span>×${count}</span></li>`).join("")}</ul></div><p class="handoff">画面をスタッフに見せて<br>カードを受け取ってください</p><p id="reload-note" class="small">この画面をスタッフに見せてください。<br>再読み込みしても結果を表示します。</p><details><summary>答えを見る</summary>${answerReview}</details><p class="small">詳細を知りたい人は、スタッフに聞いてね！</p></section>`;
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
  if (canAnswer() && state.answers.every(a => a !== null)) finish(false);
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
