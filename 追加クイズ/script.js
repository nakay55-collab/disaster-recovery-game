"use strict";

// ===== 編集用設定：問題・時間・カード枚数はここで変更できます =====
const CONFIG = {
  easySeconds: 45,
  challengeSeconds: 60,
  storageKey: "additional-quiz-v1", // 問題構成を変えた場合はバージョンを変更
  adminParam: "admin",
  adminValue: "1", // ?admin=1 で管理者用リセットを表示（認証ではありません）
};
// 正解時に獲得できるカード枚数
const REWARD_CARDS = { easy: 1, challenge: 2 };
// correct は選択肢の番号：A=0、B=1、C=2、D=3
// ----- かんたん問題（10問からランダムに1問出題） -----
const EASY_QUESTIONS = [
  { text: "道路に流れ込んだ土砂を掘ったり、すくったりするのに向いている重機はどれ？", options: ["バックホウ", "ロードローラー", "ダンプトラック", "クレーン"], correct: 0, explanation: "土砂を掘ったりすくったりする作業には、バケットを使うバックホウが向いています。" },
  { text: "バックホウですくった土砂を、現場から別の場所へ運ぶのに最も向いている車両はどれ？", options: ["クレーン", "ミニショベル", "ロードローラー", "ダンプトラック"], correct: 3, explanation: "掘った土砂を別の場所まで運ぶには、荷台に積んで走れるダンプトラックが適しています。" },
  { text: "住宅地の狭い場所で、小規模な掘削をするときに使いやすい重機はどれ？", options: ["ダンプトラック", "ロードローラー", "ミニショベル", "大型クレーン"], correct: 2, explanation: "狭い場所での小規模な掘削には、小回りのきくミニショベルが向いています。" },
  { text: "土砂を撤去したあとの道路をしっかり締め固めるときに使う機械はどれ？", options: ["ダンプトラック", "クレーン", "ロードローラー", "バックホウ"], correct: 2, explanation: "土を締め固める作業には、重みで押し固めるロードローラーを使います。" },
  { text: "大きな倒木や重い資材を持ち上げて移動するときに向いている機械はどれ？", options: ["ロードローラー", "ミニショベル", "ダンプトラック", "クレーン"], correct: 3, explanation: "重い資材や倒木を吊り上げて移動させる作業には、クレーンが向いています。" },
  { text: "重機が動いている現場で、安全のために最も大切なことはどれ？", options: ["オペレーターだけが安全を考える", "できるだけ重機の近くで見学する", "急いでいるときは確認を省略する", "作業範囲に人が入らないよう確認する"], correct: 3, explanation: "重機の周りで事故を防ぐには、作業範囲に人が入らないようにする確認が基本です。" },
  { text: "病院へ続く道路が使えなくなった場合、特に影響を受ける可能性があるものはどれ？", options: ["救急車や患者の移動", "重機の色", "道路の名前", "工事番号"], correct: 0, explanation: "病院へ続く道路が使えないと、救急搬送や通院など、人の命や生活に関わる影響が出ます。" },
  { text: "施工管理をする人の仕事として最も近いものはどれ？", options: ["土砂を運ぶことだけ", "工事費だけを計算する", "重機を運転することだけ", "工程・品質・安全などを確認して現場を調整する"], correct: 3, explanation: "施工管理は、工程・品質・安全などを確認しながら現場全体を調整する役割です。" },
  { text: "災害復旧では、工事の報酬だけでなく、安全や地域への影響も考えて工事を選ぶことが大切である。", options: ["○", "×"], correct: 0, explanation: "報酬だけでなく、安全性や地域への影響も含めて工事を選ぶことが大切です。" },
  { text: "普通自動車免許があれば、仕事で使う建設機械をすべて自由に操作できる。", options: ["○", "×"], correct: 1, explanation: "自動車の運転免許と建設機械の操作資格は別物で、機械の種類に応じた講習や教育が必要です。" },
];
// ----- チャレンジ問題（18問からランダムに1問出題） -----
// category は出題分野の偏りをなくすための内部管理用で、画面には表示しません。
// construction＝施工管理／transport＝運行管理／machinery＝建設機械
const CHALLENGE_QUESTIONS = [
  { category: "construction", text: "道路に土砂が流入し、路面まで損傷しています。\n\n復旧作業として最も適切な順番はどれ？", options: ["舗装 → 土砂撤去 → 締固め → 路床整正", "土砂撤去 → 路床整正 → 締固め → 舗装", "締固め → 土砂撤去 → 舗装 → 路床整正", "土砂撤去 → 舗装 → 締固め → 路床整正"], correct: 1, explanation: "土砂を除去した後、路床などを整え、必要な締固めを行ってから舗装へ進むという工程を考える必要があります。" },
  { category: "construction", text: "道路をロードローラーで締め固めました。\n\n見た目はきれいに平らになっています。\n\n施工管理上、最も適切な考え方は？", options: ["見た目が平らなら品質確認は不要", "ロードローラーを使えば必ず基準を満たす", "必要な締固めができているか確認する", "車を1台走らせて沈まなければ必ず合格"], correct: 2, explanation: "見た目が平らでも、規定の締固めができているかを確認しなければ、品質を保証したことにはなりません。" },
  { category: "construction", text: "工事が予定より遅れています。\n\n最も適切な対応は？", options: ["安全確認を減らして作業時間を短縮する", "遅れている原因を確認し、人員・機械・作業工程を見直す", "品質確認を省略する", "作業員全員に残業させればよい"], correct: 1, explanation: "工期の遅れは、原因を確認せずに残業や省略で対応すると、安全や品質に悪影響が出ます。まず人員・機械・工程を見直します。" },
  { category: "construction", text: "バックホウで掘削作業をしています。\n\n作業員が旋回範囲へ入る可能性があります。\n\n最も適切な安全管理は？", options: ["熟練オペレーターならそのまま作業する", "低速運転なら立入り可能", "立入範囲や合図方法を明確にして作業する", "作業員本人に注意させるだけでよい"], correct: 2, explanation: "重機の旋回範囲は死角が生じやすく、立入禁止の範囲や合図の方法を明確にしてから作業を進めることが基本です。" },
  { category: "construction", text: "現場では、\n\n・工期が遅れている\n・品質確認が必要\n・重機が稼働している\n・住民の通行もある\n\nという状況です。\n\n施工管理を担当する人が最も重視すべき考え方は？", options: ["工期だけを優先する", "安全だけを優先する", "工程・品質・安全・周辺環境を含めて調整する", "重機オペレーターにすべて任せる"], correct: 2, explanation: "施工管理は工期・品質・安全・周辺環境など、複数の要素を同時に調整する役割です。" },
  { category: "construction", text: "工事A：\n報酬900万円\n追加の重機費用200万円\n\n工事B：\n報酬750万円\n追加費用なし\n\nその他の条件が同じと仮定した場合、「報酬－追加費用」が大きいのはどちらで、差はいくら？", options: ["A工事が150万円多い", "A工事が50万円多い", "B工事が50万円多い", "同額"], correct: 2, explanation: "Aは900－200＝700万円。Bは750万円。単純比較ではBが50万円多くなります。" },
  { category: "transport", text: "ドライバーが出発前に、\n\n「昨夜ほとんど眠れていません」\n\nと申し出ました。\n\n安全な運行管理として最も適切なのは？", options: ["本人が大丈夫と言えば必ず運転させる", "配送が遅れるのでそのまま出発させる", "状態を確認し、安全に運転できるか判断する", "コーヒーを飲ませれば必ず出発できる"], correct: 2, explanation: "睡眠不足は重大事故につながるおそれがあるため、本人の申告だけで判断せず、状態を確認して出発の可否を判断します。" },
  { category: "transport", text: "事業用トラックを安全に運行するため、出発前に確認すべき内容として最も適切な組み合わせは？", options: ["運転者の状態・車両の状態・運行に必要な情報", "運転者の制服・昼食・スマートフォン", "荷主の会社規模・売上・社員数", "トラックの色・メーカー・購入価格"], correct: 0, explanation: "安全運行のためには、運転者本人の状態・車両の整備状況・運行に必要な情報を出発前に確認します。" },
  { category: "transport", text: "トラックが平均時速48kmで1時間45分走りました。\n\nこの間に進む距離は？", options: ["72km", "80km", "84km", "96km"], correct: 2, explanation: "1時間45分＝1.75時間。48×1.75＝84kmです。" },
  { category: "transport", text: "150kmの区間を3時間で走りました。\n\n平均速度は？", options: ["40km/h", "45km/h", "50km/h", "60km/h"], correct: 2, explanation: "150km÷3時間＝時速50kmです。" },
  { category: "transport", text: "配送先まで120kmあります。\n\n平均時速60kmで走れると仮定していますが、途中で30分の休憩を取ります。\n\n到着までに必要な時間は？", options: ["1時間30分", "2時間", "2時間30分", "3時間"], correct: 2, explanation: "走行に120÷60＝2時間。休憩30分を加えるため2時間30分です。" },
  { category: "transport", text: "運行管理者の仕事の考え方として最も適切なのは？", options: ["配送ルートを決めることだけ", "車両を運転することだけ", "運行の安全を確保するため、運転者や運行状況などを管理する", "トラックを整備することだけ"], correct: 2, explanation: "運行管理者は運転そのものではなく、運転者の状態管理や運行計画など、安全な運行を確保するための管理を担います。" },
  { category: "machinery", text: "機体重量2.8tの油圧ショベルと3.2tの油圧ショベルがあります。\n\n仕事で整地・掘削作業をする場合の考え方として最も適切なのは？", options: ["両方とも普通自動車免許だけでよい", "2.8tは小型車両系建設機械の特別教育、3.2tは車両系建設機械運転技能講習", "2.8tは技能講習、3.2tは特別教育", "両方とも施工管理技士が必要"], correct: 1, explanation: "機体重量3t未満は特別教育、3t以上は技能講習の対象となるなど、重量によって必要な資格が変わります。" },
  { category: "machinery", text: "車両系建設機械運転技能講習（整地・運搬・積込み・掘削）を修了している場合の説明として最も適切なのは？", options: ["3t以上の対象となる油圧ショベル等を運転でき、3t未満も扱える", "3t未満の機械しか運転できない", "道路を走るすべての自動車を運転できる", "クレーン作業もすべて自動的にできる"], correct: 0, explanation: "3t以上を対象とする技能講習を修了していれば、3t未満の同種の機械も扱うことができます。" },
  { category: "machinery", text: "油圧ショベルの車両系建設機械運転技能講習を修了した人が、ロードローラーを運転しようとしています。\n\n最も適切なのは？", options: ["技能講習があるので無条件に運転できる", "ローラー運転に必要な特別教育について確認する", "普通免許だけあればよい", "現場リーダーが許可すれば教育は不要"], correct: 1, explanation: "油圧ショベルの技能講習と、ロードローラーの運転に必要な教育は別物であるため、あらためて確認が必要です。" },
  { category: "machinery", text: "大量の土砂をバックホウで撤去します。\n\nしかし、ダンプトラックが手配できていません。\n\n最も適切な対応は？", options: ["とにかくすべて掘削する", "土砂の搬出方法や仮置き場所を確認してから作業計画を決める", "ロードローラーで土砂を固める", "クレーンで土砂を吊り上げる"], correct: 1, explanation: "重機だけでなく、搬出方法や仮置き場所など、現場全体の段取りを確認してから作業を進めることが大切です。" },
  { category: "machinery", text: "道路上の大きな倒木をクレーンで撤去する予定です。\n\n倒木の近くに電線があります。\n\n最初に考えるべきことは？", options: ["クレーンの作業速度", "ダンプの積載量", "電線を含む周囲の危険を確認し、安全な施工方法を決める", "工事報酬"], correct: 2, explanation: "電線などの周辺の危険を確認し、安全な施工方法を決めてから作業に入ることが最優先です。" },
  { category: "machinery", text: "次の工事があります。\n\n報酬1000万円。\n\nただし、\n\n・必要な重機1台が不足\n・追加手配費250万円\n・周辺に住宅あり\n・迂回路あり\n\n別の工事は、\n\n報酬800万円\n追加費用なし\n病院へつながる唯一の道路\n\n最も適切な考え方は？", options: ["1000万円の工事を必ず選ぶ", "800万円の工事を必ず選ぶ", "報酬・追加費用・緊急性・迂回路・安全・地域への影響を比較して判断する", "必要な重機の台数だけで決める"], correct: 2, explanation: "報酬だけでなく、追加費用・緊急性・安全性・地域への影響など、複数の要素を比較して判断することが大切です。" },
];
// ===== 以下は画面・進行処理 =====
const app = document.getElementById("app");
const dialog = document.getElementById("finish-dialog");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const formatQuestionText = (text) => escapeHtml(text).replace(/\n/g, "<br>");
function poolFor(mode) { return mode === "easy" ? EASY_QUESTIONS : mode === "challenge" ? CHALLENGE_QUESTIONS : null; }
function findQuestionById(id) {
  if (typeof id !== "string") return null;
  const sep = id.indexOf("-");
  if (sep === -1) return null;
  const mode = id.slice(0, sep);
  const idx = Number(id.slice(sep + 1));
  const pool = poolFor(mode);
  if (!pool || !Number.isInteger(idx) || idx < 0 || idx >= pool.length) return null;
  return pool[idx];
}
function secondsFor(mode) { return mode === "easy" ? CONFIG.easySeconds : CONFIG.challengeSeconds; }
// 直前と同じ問題を避け、チャレンジは直前と同じ分野も（可能な範囲で）避けて出題します。
function pickQuestion(mode, history) {
  const pool = poolFor(mode);
  const lastId = mode === "easy" ? history.lastEasyId : history.lastChallengeId;
  let candidates = pool.map((q, i) => ({ q, id: `${mode}-${i}` })).filter(c => c.id !== lastId);
  if (candidates.length === 0) candidates = pool.map((q, i) => ({ q, id: `${mode}-${i}` }));
  if (mode === "challenge" && history.lastChallengeCategory) {
    const differentCategory = candidates.filter(c => c.q.category !== history.lastChallengeCategory);
    if (differentCategory.length > 0) candidates = differentCategory;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
const freshState = () => ({ status: "select", mode: null, questionId: null, answer: null, deadline: null, timedOut: false });
const freshHistory = () => ({ lastEasyId: null, lastChallengeId: null, lastChallengeCategory: null });
let state = freshState();
let history = freshHistory();
let timerId;
let storageBroken = false;

function storageWarning() {
  storageBroken = true;
  document.getElementById("storage-warning").hidden = false;
}
function validState(s) {
  if (!s || !["select", "active", "result"].includes(s.status)) return false;
  if (s.status === "select") return s.mode === null && s.questionId === null && s.answer === null;
  if (!["easy", "challenge"].includes(s.mode)) return false;
  const q = findQuestionById(s.questionId);
  if (!q) return false;
  if (!(s.answer === null || (Number.isInteger(s.answer) && s.answer >= 0 && s.answer < q.options.length))) return false;
  if (!(Number.isFinite(s.deadline) && s.deadline > 0)) return false;
  return typeof s.timedOut === "boolean";
}
function validHistory(h) {
  const okId = v => v === null || typeof v === "string";
  return h && okId(h.lastEasyId) && okId(h.lastChallengeId) && okId(h.lastChallengeCategory);
}
function readSaved() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!validState(saved.state) || !validHistory(saved.history)) throw new Error("Invalid saved data");
    return saved;
  } catch { storageWarning(); return null; }
}
function saveAll() {
  try { localStorage.setItem(CONFIG.storageKey, JSON.stringify({ state, history })); }
  catch { storageWarning(); }
}
function remainingSeconds() { return Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000)); }
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function focusHeading() {
  const heading = app.querySelector("h1, h2");
  heading?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderSelect() {
  app.innerHTML = `<section class="panel"><p class="eyebrow">BONUS QUIZ</p><div class="hero-art" aria-hidden="true"></div><h1 tabindex="-1">追加クイズ</h1><p class="intro">かんたん問題かチャレンジ問題を選んで、追加のカードを狙おう！</p><div class="mode-choice"><button type="button" class="mode-button" data-mode="easy"><span class="mode-title">かんたん　正解でカード${REWARD_CARDS.easy}枚</span><span class="mode-desc">重機の名前や基礎知識を問う問題です</span></button><button type="button" class="mode-button challenge" data-mode="challenge"><span class="mode-title">チャレンジ　正解でカード${REWARD_CARDS.challenge}枚</span><span class="mode-desc">施工管理・運行管理・建設機械など、実際の資格試験分野を参考にした問題が出ます</span></button></div><p class="small">チームで相談して1つの答えを決めてください。どの分野の問題が出るかは、始まるまで分かりません。</p></section>`;
  app.querySelectorAll("[data-mode]").forEach(button => {
    button.onclick = () => {
      const saved = readSaved();
      if (saved && saved.state.status !== "select") { state = saved.state; history = saved.history; render(); return; }
      const mode = button.dataset.mode;
      const pick = pickQuestion(mode, history);
      if (mode === "easy") history.lastEasyId = pick.id;
      else { history.lastChallengeId = pick.id; history.lastChallengeCategory = pick.q.category; }
      state = freshState();
      state.status = "active";
      state.mode = mode;
      state.questionId = pick.id;
      state.deadline = Date.now() + secondsFor(mode) * 1000;
      saveAll(); render(); focusHeading();
    };
  });
}
// 操作直前にも期限と他タブの終了状態を確認します。
function canAnswer() {
  const saved = readSaved();
  if (saved?.state.status === "result") { state = saved.state; history = saved.history; render(); return false; }
  if (state.status !== "active") return false;
  if (Date.now() >= state.deadline) { finish(true); return false; }
  return true;
}
function renderQuestion() {
  const q = findQuestionById(state.questionId);
  const modeLabel = state.mode === "easy" ? "かんたん問題" : "チャレンジ問題";
  app.innerHTML = `<div class="status"><div class="status-row"><div class="count">${modeLabel}</div><div id="timer" class="timer" role="timer" aria-live="off"><span>残り時間</span><strong id="time"></strong></div></div></div><section class="panel"><p class="team-hint">チームで相談して1つ選んでください</p><h2 id="question" tabindex="-1">${formatQuestionText(q.text)}</h2><div class="options" role="group" aria-labelledby="question">${q.options.map((option, i) => `<button type="button" class="option" data-answer="${i}" aria-pressed="${state.answer === i}"><span class="letter">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(option)}</span><span class="selected-mark" aria-hidden="true">${state.answer === i ? "✓" : ""}</span></button>`).join("")}</div><p id="error" class="error" role="alert"></p><button id="submit" type="button" class="primary wide">回答する</button></section>`;
  app.querySelectorAll("[data-answer]").forEach(button => {
    button.onclick = () => {
      if (!canAnswer()) return;
      state.answer = Number(button.dataset.answer);
      saveAll();
      app.querySelectorAll("[data-answer]").forEach(b => {
        const selected = Number(b.dataset.answer) === state.answer;
        b.setAttribute("aria-pressed", String(selected));
        b.querySelector(".selected-mark").textContent = selected ? "✓" : "";
      });
      document.getElementById("error").textContent = "";
    };
  });
  document.getElementById("submit").onclick = () => {
    if (!canAnswer()) return;
    if (state.answer === null) {
      document.getElementById("error").textContent = "回答を選んでください"; return;
    }
    dialog.showModal();
    document.getElementById("cancel-finish").focus();
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
  state.status = "result";
  state.timedOut = timedOut;
  saveAll();
  if (dialog.open) dialog.close();
  render(); focusHeading();
}
function renderResult() {
  if (dialog.open) dialog.close();
  const q = findQuestionById(state.questionId);
  const success = !state.timedOut && state.answer === q.correct;
  const reward = REWARD_CARDS[state.mode];
  const isChallenge = state.mode === "challenge";
  const headline = success ? (isChallenge ? "チャレンジ成功！" : "せいかい！") : (isChallenge ? "チャレンジ失敗" : "ざんねん");
  const sub = success ? `カード${reward}枚獲得！` : "カード獲得なし";
  app.innerHTML = `<section class="panel result"><p class="eyebrow">QUIZ RESULT</p>${state.timedOut ? '<div class="timeout">TIME OUT</div>' : ""}<p class="result-headline ${success ? "success" : "fail"}" tabindex="-1">${headline}</p><p class="result-sub">${sub}</p><div class="answer-box"><p class="answer-correct">正解：${String.fromCharCode(65 + q.correct)}. ${escapeHtml(q.options[q.correct])}</p><p class="answer-note">${escapeHtml(q.explanation)}</p></div><p class="small">この画面をスタッフに見せてください。<br>再読み込みしても結果を表示します。</p><button id="retry" type="button" class="primary wide">つぎに挑戦する</button></section>`;
  document.getElementById("retry").onclick = () => {
    state = freshState();
    saveAll(); render(); focusHeading();
  };
}
function render() {
  clearInterval(timerId);
  if (state.status === "select") renderSelect();
  else if (state.status === "result") renderResult();
  else {
    if (Date.now() >= state.deadline) { finish(true); return; }
    renderQuestion();
    timerId = setInterval(updateTimer, 200);
  }
}
document.getElementById("cancel-finish").onclick = () => dialog.close();
document.getElementById("confirm-finish").onclick = () => {
  if (canAnswer() && state.answer !== null) finish(false);
};
const isAdmin = new URLSearchParams(location.search).get(CONFIG.adminParam) === CONFIG.adminValue;
document.getElementById("admin").hidden = !isAdmin;
document.getElementById("reset").onclick = () => {
  if (!isAdmin || !window.confirm("保存された回答・出題履歴をすべて削除し、最初からやり直しますか？")) return;
  if (dialog.open) dialog.close();
  state = freshState(); history = freshHistory(); saveAll(); render(); focusHeading();
};
function syncState() {
  const saved = readSaved();
  if (saved) { state = saved.state; history = saved.history; }
  render();
}
window.addEventListener("storage", event => { if (event.key === CONFIG.storageKey) syncState(); });
window.addEventListener("pageshow", syncState);
document.addEventListener("visibilitychange", () => { if (!document.hidden) syncState(); });
const initialSaved = readSaved();
if (initialSaved) { state = initialSaved.state; history = initialSaved.history; }
saveAll(); // 開始前に保存可否を確認
render();
