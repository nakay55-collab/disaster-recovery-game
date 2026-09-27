"use strict";

// ===== 編集用設定：問題・時間・カード配布枚数はここで変更できます =====
const CONFIG = {
  durationSeconds: 5 * 60,
  storageKey: "project2-team-quiz-v1", // 問題構成を変えた場合はバージョンを変更
  adminParam: "admin",
  adminValue: "1", // ?admin=1 で管理者用リセットを表示（認証ではありません）
};
// correct は選択肢の番号：A=0、B=1、C=2、D=3
const QUESTIONS = [
  { text: "台風で主要道路に大量の土砂が流れ込みました。\n\n道路幅は広く、土砂量も多いです。\n\n撤去から運搬まで考えたとき、最も適した組み合わせはどれ？", options: ["ミニショベル＋ロードローラー", "バックホウ＋ダンプトラック", "クレーン＋ロードローラー", "ダンプトラック＋ロードローラー"], correct: 1, explanation: "道路幅が広く土砂量が多い現場では、掘削・積込みにバックホウ、運搬に大型のダンプトラックを組み合わせるのが基本です。" },
  { text: "住宅地の狭い道路で、側溝に大量の泥が詰まっています。\n\n近くには住宅があり、大型重機は入りにくい状況です。\n\n最も適切なのは？", options: ["大型バックホウを入れる", "クレーンで泥を持ち上げる", "ミニショベルを使い、周囲への安全配慮も行う", "ロードローラーで押し固める"], correct: 2, explanation: "住宅が近く大型機械が入りにくい狭い道路では、小回りのきくミニショベルを使い、周囲の安全にも配慮します。" },
  { text: "大きな倒木が道路をふさいでいます。\n\n倒木の近くには電線があり、周辺には住民もいます。\n\n最初に行うべきことは？", options: ["すぐにクレーンで持ち上げる", "ダンプトラックを先に入れる", "周囲の危険を確認し、安全な作業範囲を確保する", "報酬額を確認する"], correct: 2, explanation: "電線や住民がいる現場では、作業を始める前に周囲の危険を確認し、安全な作業範囲を確保することが最優先です。" },
  { text: "土砂を撤去した道路を復旧します。\n\n見た目は平らですが、そのまま車を通すと路面が沈む可能性があります。\n\n次に必要な作業は？", options: ["クレーンで持ち上げる", "ロードローラーなどで締め固める", "さらに深く掘る", "すぐ通行を再開する"], correct: 1, explanation: "土を戻しただけでは地盤が緩く、車の重みで沈むおそれがあるため、ロードローラーなどでしっかり締め固めます。" },
  { text: "バックホウなどの建設機械を仕事で操作するときの考え方として、最も適切なのは？", options: ["普通自動車免許だけですべて操作できる", "機械の種類や大きさに応じて、技能講習や特別教育などが必要になる", "現場リーダーがいれば誰でも操作できる", "災害復旧であれば資格や教育は必要ない"], correct: 1, explanation: "自動車の運転免許と建設機械の操作資格は別物で、機械の種類・大きさに応じた技能講習や特別教育が必要です。" },
  { text: "重機を使う工事現場で、事故を防ぐために最も適切なのは？", options: ["作業員を重機の近くに集める", "作業範囲を確認し、人が不用意に入らないようにする", "オペレーターだけが安全確認する", "急いでいれば安全確認を省略する"], correct: 1, explanation: "重機の作業範囲を明確にし、人が不用意に近づかないよう確認することが事故防止の基本です。" },
  { text: "報酬は高いものの、必要な重機が1台不足している現場があります。\n\nさらに周辺には多くの住民がいます。\n\n最も適切な判断は？", options: ["報酬が高いので必ず受ける", "重機不足は無視して工事を始める", "報酬・安全・必要な人員や重機・地域への影響を確認して判断する", "地域への影響だけで判断する"], correct: 2, explanation: "報酬だけでなく、安全・必要な人員や重機・地域への影響も含めて総合的に判断することが会社としての責任です。" },
  { text: "病院へ続く道路と、工業地域へ続く道路が被災しています。\n\n工業地域へ続く道路の方が報酬は高いです。\n\nどちらを先に復旧するか判断するために、さらに必要な情報は？", options: ["道路名の長さ", "それぞれの道路が誰にどれくらい影響するか", "使用する重機の色", "工事番号"], correct: 1, explanation: "報酬だけでなく、病院など道路が誰にどれくらい影響するかを確認したうえで復旧の優先順位を判断します。" },
];
// 選べる重機カード・人カードの種類（結果画面に表示するだけで、在庫管理はしません）
const HEAVY_CARD_TYPES = ["バックホウ", "ミニショベル", "ダンプトラック", "ロードローラー", "クレーン"];
const PEOPLE_CARD_TYPES = ["重機オペレーター", "現場リーダー", "地域サポート"];
// 正解数ごとのカード配布枚数。minCorrect（最低正解数）の大きい順に並べます。
const CARD_TIERS = [
  { minCorrect: 7, heavyCards: 5, peopleCards: 2, message: "すばらしい！" },
  { minCorrect: 5, heavyCards: 4, peopleCards: 2 },
  { minCorrect: 3, heavyCards: 3, peopleCards: 2 },
  { minCorrect: 0, heavyCards: 2, peopleCards: 2 },
];
// ===== 以下は画面・進行処理 =====
const app = document.getElementById("app");
const dialog = document.getElementById("finish-dialog");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const formatQuestionText = (text) => escapeHtml(text).replace(/\n/g, "<br>");
const freshState = () => ({ status: "ready", answers: Array(QUESTIONS.length).fill(null), index: 0, deadline: null, timedOut: false });
const grade = answers => answers.reduce((sum, answer, i) => sum + Number(answer === QUESTIONS[i].correct), 0);
const chooseTier = score => CARD_TIERS.find(tier => score >= tier.minCorrect);
let state = freshState();
let timerId;
let storageBroken = false;

function storageWarning() {
  storageBroken = true;
  document.getElementById("storage-warning").hidden = false;
}
function validState(s) {
  return s && ["ready", "active", "finished"].includes(s.status)
    && Array.isArray(s.answers) && s.answers.length === QUESTIONS.length
    && s.answers.every((a, i) => a === null || (Number.isInteger(a) && a >= 0 && a < QUESTIONS[i].options.length))
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
  app.innerHTML = `<section class="panel"><p class="eyebrow">PROJECT2 - TEAM CHALLENGE</p><div class="hero-art" aria-hidden="true"></div><h1 tabindex="-1">PROJECT2 チームクイズ</h1><p class="intro">チームで相談して${QUESTIONS.length}問に挑戦しよう！<br>正解数に応じて、PROJECT2で使えるカードを獲得できます。</p><div class="facts"><div class="fact">全<strong>${QUESTIONS.length}</strong>問</div><div class="fact">制限時間<strong>${minutes}</strong>分</div><div class="fact">チームで<strong>相談OK</strong></div></div><button id="start" class="primary wide" type="button">クイズスタート <span aria-hidden="true">→</span></button><p class="small">1つの答えをチームで話し合って決めてください。回答中は前の問題に戻れます。終了後のやり直しはできません。</p></section>`;
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
  app.innerHTML = `<div class="status"><div class="status-row"><div class="count">${state.index + 1} / ${QUESTIONS.length}<span> 問目</span></div><div id="timer" class="timer" role="timer" aria-live="off"><span>残り時間</span><strong id="time"></strong></div></div><progress value="${state.index + 1}" max="${QUESTIONS.length}" aria-label="現在の問題 ${state.index + 1} / ${QUESTIONS.length}"></progress></div><section class="panel"><p class="question-label">QUESTION ${String(state.index + 1).padStart(2, "0")}</p><p class="team-hint">チームで相談して1つ選んでください</p><h2 id="question" tabindex="-1">${formatQuestionText(q.text)}</h2><div class="options" role="group" aria-labelledby="question">${q.options.map((option, i) => `<button type="button" class="option" data-answer="${i}" aria-pressed="${state.answers[state.index] === i}"><span class="letter">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(option)}</span><span class="selected-mark" aria-hidden="true">${state.answers[state.index] === i ? "✓" : ""}</span></button>`).join("")}</div><p id="error" class="error" role="alert"></p><div class="navigation"><button id="back" type="button" class="secondary" ${state.index === 0 ? "disabled" : ""}>戻る</button><button id="next" type="button" class="primary">${state.index === QUESTIONS.length - 1 ? "回答を終了する" : "次へ →"}</button></div></section>`;
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
    if (state.index < QUESTIONS.length - 1) {
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
  const score = grade(state.answers);
  const tier = chooseTier(score);
  const total = tier.heavyCards + tier.peopleCards;
  const answerReview = QUESTIONS.map((q, i) => {
    const yourAnswer = state.answers[i];
    const isCorrect = yourAnswer === q.correct;
    const yourAnswerText = yourAnswer === null ? "未回答" : escapeHtml(q.options[yourAnswer]);
    return `<div class="explanation ${isCorrect ? "is-correct" : "is-wrong"}"><p class="explanation-q"><strong>Q${i + 1}</strong><span class="result-tag">${isCorrect ? "正解" : "不正解"}</span></p><p class="explanation-text">${formatQuestionText(q.text)}</p><p class="explanation-answer">チームの回答：${yourAnswerText}</p><p class="explanation-correct">正解：${String.fromCharCode(65 + q.correct)}. ${escapeHtml(q.options[q.correct])}</p><p class="explanation-note">${escapeHtml(q.explanation)}</p></div>`;
  }).join("");
  app.innerHTML = `<section class="panel result"><p class="eyebrow">QUIZ RESULT</p>${state.timedOut ? '<div class="timeout">TIME OUT</div><p class="small">制限時間になりました。未回答の問題は不正解として採点しました。</p>' : '<p class="small">回答が終了しました。おつかれさまでした！</p>'}<h1 class="score" tabindex="-1">${QUESTIONS.length}問中 <strong>${score}</strong>問正解</h1>${tier.message ? `<p class="congrats">${escapeHtml(tier.message)}</p>` : ""}<div class="set-box"><p class="cards-title">獲得カード</p><ul class="cards"><li><span>重機カード</span><span>${tier.heavyCards}枚</span></li><li><span>人カード</span><span>${tier.peopleCards}枚</span></li></ul><p class="cards-total">合計 ${total}枚</p></div><p class="small">獲得した枚数分、カードを選んでスタッフから受け取ってください。</p><div class="card-types"><p class="cards-title">選べる重機カード</p><ul class="type-list">${HEAVY_CARD_TYPES.map(name => `<li>${escapeHtml(name)}</li>`).join("")}</ul><p class="small">同じ種類の重機カードは最大2枚まで</p><p class="cards-title">選べる人カード</p><ul class="type-list">${PEOPLE_CARD_TYPES.map(name => `<li>${escapeHtml(name)}</li>`).join("")}</ul></div><p class="handoff">画面をスタッフに見せて<br>カードを受け取ってください</p><p id="reload-note" class="small">この画面をスタッフに見せてください。<br>再読み込みしても結果を表示します。</p><details><summary>答えを見る</summary>${answerReview}</details></section>`;
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
