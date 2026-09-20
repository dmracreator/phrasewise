/* =============================================================
   Phrasewise — app logic
   Screen routing, session building, answer checking and audio.
   Depends on curriculum.js (CATS, LANGS, ALL).
   ============================================================= */

/* Who the home screen greets, and the daily target. */
const CONFIG = {
  learnerName: "Kees",
  dailyGoal: 15
};

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const app = $("#app");

/* --- light persistence (per-viewer convenience only) --- */
const store = {
  get(){ try { return JSON.parse(localStorage.getItem("phrasewise") || "null") || {}; }
         catch(e){ return {}; } },
  set(v){ try { localStorage.setItem("phrasewise", JSON.stringify(v)); } catch(e){} }
};
let state = Object.assign({
  streak: 6,
  todayDone: 7,
  todayGoal: CONFIG.dailyGoal,
  offsets: { fr:24, zh:16, ar:0 }
}, store.get());

/* --- screens --- */
let current = "home";
function setScreen(name){
  current = name;
  $$(".screen").forEach(s => s.classList.toggle("is-active", s.id === "screen-" + name));
  const sc = $("#screen-" + name + " .scroll");
  if (sc) sc.scrollTop = 0;
  stopAudio();
}

/* --- home --- */
function renderHome(){
  const h = new Date().getHours();
  $("#greeting").textContent =
    (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") +
    (CONFIG.learnerName ? ", " + CONFIG.learnerName : "");
  $("#today-label").textContent = new Date().toLocaleDateString("en-GB",
    { weekday:"long", day:"numeric", month:"long" });

  const pct = Math.min(1, state.todayDone / state.todayGoal);
  const C = 2 * Math.PI * 23;
  const bar = $("#ring-bar");
  bar.setAttribute("stroke-dasharray", C.toFixed(1));
  bar.setAttribute("stroke-dashoffset", (C * (1 - pct)).toFixed(1));
  $("#daily-count").textContent = state.todayDone + " of " + state.todayGoal + " phrases";
  $("#streak-chip-n").textContent = state.streak + " days";

  const wrap = $("#lang-cards");
  wrap.textContent = "";
  for (const k of ["fr","zh","ar"]) {
    const L = LANGS[k];
    const total = ALL[k].length;
    const pctDone = Math.round(L.done / total * 100);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "lang-card";
    card.dataset.lang = k;
    card.setAttribute("aria-label", "Continue " + L.name + ", " + L.level + ", " + L.unit);
    card.innerHTML =
      '<div class="lang-top">' +
        '<span class="flag-dot" aria-hidden="true">' + L.glyph + '</span>' +
        '<span><span class="lang-name">' + L.name + '</span>' +
        '<span class="lang-native" style="display:block">' + L.native + '</span></span>' +
        '<span class="level-chip">' + L.level + '</span>' +
      '</div>' +
      '<p class="lang-unit">' + L.unit + ' · ' + CATS[L.unitCat] + '</p>' +
      '<div class="track-row">' +
        '<span class="lang-count">' + L.done + '/' + total + '</span>' +
        '<span class="track-bar"><i style="width:' + pctDone + '%"></i></span>' +
        '<span class="continue-pill">Continue' +
          '<svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.4 1.3 5.6 5.5l-4.2 4.2"/></svg>' +
        '</span>' +
      '</div>';
    card.addEventListener("click", () => startSession(k));
    wrap.appendChild(card);
  }
}

/* --- session --- */
let session = null;

function pick(arr, n){
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
}

function buildQueue(langKey){
  if (langKey === "mix"){
    return pick([].concat(ALL.fr, ALL.zh, ALL.ar), 10);
  }
  const pool = ALL[langKey];
  const start = (state.offsets[langKey] || 0) % pool.length;
  const q = [];
  for (let i = 0; i < 10; i++) q.push(pool[(start + i) % pool.length]);
  return q;
}

function startSession(langKey, queue){
  session = {
    lang: langKey,
    queue: queue || buildQueue(langKey),
    i: 0,
    correct: 0,
    wrong: [],
    answered: false
  };
  app.dataset.lang = langKey;
  renderLesson();
  setScreen("lesson");
}

function currentItem(){ return session.queue[session.i]; }
function langOf(item){ return LANGS[item.lang]; }

function renderLesson(){
  const it = currentItem();
  const L = langOf(it);
  if (session.lang !== "mix") app.dataset.lang = it.lang;

  const n = session.i + 1, total = session.queue.length;
  $("#lesson-count").textContent = n + " of " + total;
  $("#lesson-prog").style.width = (n / total * 100) + "%";
  $("#quiz-count").textContent = n + " of " + total;
  $("#quiz-prog").style.width = (n / total * 100) + "%";

  $("#lesson-lang").textContent = L.name;
  $("#lesson-cat").textContent = CATS[it.cat];

  const ph = $("#lesson-phrase");
  ph.className = "phrase " + L.script;
  ph.textContent = it.target;
  ph.setAttribute("lang", L.voice.slice(0,2));
  ph.setAttribute("dir", L.script === "ar" ? "rtl" : "ltr");

  $("#lesson-sub").className = "phrase-sub " + L.script;
  $("#lesson-sub").querySelector(".sub-key").textContent = L.subKey;
  $("#lesson-sub-text").textContent = it.sub;

  $("#slow-btn").setAttribute("aria-pressed", "false");
  slowMode = false;
}

function renderQuiz(){
  const it = currentItem();
  const L = langOf(it);
  session.answered = false;

  const t = $("#quiz-target");
  t.className = "q-target " + L.script;
  t.textContent = it.target;
  t.setAttribute("lang", L.voice.slice(0,2));
  t.setAttribute("dir", L.script === "ar" ? "rtl" : "ltr");

  const s = $("#quiz-sub");
  s.className = "q-sub " + L.script;
  s.textContent = it.sub;

  /* distractors: same language, prefer same collection */
  const pool = ALL[it.lang].filter(p => p.en !== it.en);
  const same = pool.filter(p => p.cat === it.cat);
  const chosen = [];
  const take = arr => {
    for (const p of pick(arr, arr.length)){
      if (chosen.length >= 3) break;
      if (!chosen.some(c => c.en === p.en)) chosen.push(p);
    }
  };
  take(same); take(pool);
  const opts = pick(chosen.slice(0,3).map(p => p.en).concat([it.en]), 4);

  const box = $("#options");
  box.textContent = "";
  opts.forEach(text => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "option";
    b.innerHTML = '<span class="mark" aria-hidden="true">' +
      '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 6.8 5 9.2l5.4-6"/></svg>' +
      '</span><span>' + text + '</span>';
    b.addEventListener("click", () => answer(b, text, it));
    box.appendChild(b);
  });

  $("#verdict").textContent = "";
  $("#verdict").className = "verdict";
  $("#quiz-continue").disabled = true;
  $("#quiz-continue").textContent = "Continue";
}

function answer(btn, text, it){
  if (session.answered) return;
  session.answered = true;

  const buttons = $$("#options .option");
  buttons.forEach(b => { b.disabled = true; });

  const right = text === it.en;
  buttons.forEach(b => {
    const label = b.lastChild.textContent;
    if (label === it.en) b.classList.add("correct");
    else if (b === btn) {
      b.classList.add("wrong");
      b.querySelector(".mark").innerHTML =
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>';
    }
    else b.classList.add("dim");
  });

  const v = $("#verdict");
  if (right){
    session.correct++;
    state.todayDone = Math.min(state.todayGoal, state.todayDone + 1);
    v.className = "verdict good";
    v.textContent = "Correct — " + it.en;
  } else {
    session.wrong.push(it);
    v.className = "verdict bad";
    v.textContent = "Not quite. The right meaning is highlighted.";
  }
  $("#quiz-continue").disabled = false;
  $("#quiz-continue").textContent =
    session.i + 1 === session.queue.length ? "Finish session" : "Continue";
}

function nextItem(){
  session.i++;
  if (session.i >= session.queue.length){ finish(); return; }
  renderLesson();
  setScreen("lesson");
}

function finish(){
  const total = session.queue.length;
  const acc = Math.round(session.correct / total * 100);
  if (session.lang !== "mix" && LANGS[session.lang]){
    const L = LANGS[session.lang];
    L.done = Math.min(ALL[session.lang].length, L.done + session.correct);
    state.offsets[session.lang] = ((state.offsets[session.lang] || 0) + total) % ALL[session.lang].length;
  }
  state.streak = Math.max(state.streak, 7);
  store.set(state);

  $("#done-h").textContent =
    (acc === 100 ? "Flawless — " : acc >= 80 ? "Excellent — " : "Well done — ") +
    total + " phrases practised";
  $("#done-s").textContent = session.wrong.length === 0
    ? "Every meaning recognised first time. Come back tomorrow to keep it warm."
    : "You recognised " + session.correct + " of " + total +
      " first time. The rest are worth one more listen.";
  $("#stat-acc").textContent = acc + "%";
  $("#stat-learned").textContent = total;
  $("#stat-streak").textContent = state.streak;

  const list = $("#miss-list"), items = $("#miss-items");
  items.textContent = "";
  if (session.wrong.length){
    list.style.display = "";
    session.wrong.forEach(it => {
      const row = document.createElement("div");
      row.className = "miss";
      const a = document.createElement("span");
      a.className = LANGS[it.lang].script;
      a.textContent = it.target;
      const b = document.createElement("span");
      b.textContent = it.en;
      row.append(a, b);
      items.appendChild(row);
    });
    $("#review-btn").disabled = false;
    $("#review-btn").textContent = "Review mistakes (" + session.wrong.length + ")";
  } else {
    list.style.display = "none";
    $("#review-btn").disabled = true;
    $("#review-btn").textContent = "No mistakes to review";
  }

  renderHome();
  setScreen("done");
}

/* --- audio --- */
let slowMode = false, audioTimer = null;

function buildWave(){
  const w = $("#wave");
  w.textContent = "";
  const heights = [8,13,20,29,22,15,26,34,24,17,11,19,30,38,27,20,32,25,14,21,33,28,18,12,23,31,20,15,25,18,11,8];
  heights.forEach((h, i) => {
    const bar = document.createElement("i");
    bar.style.setProperty("--h", h);
    bar.style.setProperty("--i", i);
    w.appendChild(bar);
  });
}

function stopAudio(){
  clearTimeout(audioTimer);
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
  $("#play-btn").closest(".audio-zone").classList.remove("is-playing");
  $("#quiz-play").classList.remove("is-playing");
}

function playPhrase(slow, fromQuiz){
  if (!session) return;
  const it = currentItem();
  const L = langOf(it);
  stopAudio();

  const zone = $("#play-btn").closest(".audio-zone");
  if (fromQuiz) $("#quiz-play").classList.add("is-playing");
  else zone.classList.add("is-playing");

  const est = Math.max(1500, it.target.length * (slow ? 190 : 110));
  let spoke = false;
  try {
    if (window.speechSynthesis && window.SpeechSynthesisUtterance){
      const u = new SpeechSynthesisUtterance(it.target);
      u.lang = L.voice;
      u.rate = slow ? 0.5 : 0.88;
      u.onend = stopAudio;
      u.onerror = stopAudio;
      window.speechSynthesis.speak(u);
      spoke = true;
    }
  } catch(e){ spoke = false; }
  audioTimer = setTimeout(stopAudio, spoke ? est + 2500 : est);
}

/* --- wiring --- */
buildWave();
renderHome();

$("#play-btn").addEventListener("click", () => playPhrase(slowMode, false));
$("#replay-btn").addEventListener("click", () => playPhrase(slowMode, false));
$("#slow-btn").addEventListener("click", e => {
  slowMode = !slowMode;
  e.currentTarget.setAttribute("aria-pressed", String(slowMode));
  playPhrase(slowMode, false);
});
$("#quiz-play").addEventListener("click", () => playPhrase(slowMode, true));

$("#to-quiz").addEventListener("click", () => { renderQuiz(); setScreen("quiz"); });
$("#quiz-continue").addEventListener("click", nextItem);
$("#quick-btn").addEventListener("click", () => startSession("mix"));
$("#again-btn").addEventListener("click", () => startSession(session ? session.lang : "fr"));
$("#review-btn").addEventListener("click", () => {
  if (!session || !session.wrong.length) return;
  startSession(session.lang, session.wrong.slice());
});

$$("[data-go]").forEach(b => b.addEventListener("click", () => {
  const to = b.dataset.go;
  if (to === "home"){ renderHome(); setScreen("home"); }
  else setScreen(to);
}));

/* status bar clock */
(function tick(){
  const d = new Date();
  $("#clock").textContent = d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
  setTimeout(tick, 20000);
})();
