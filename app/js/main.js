// Screens, timer and word updates for Hoot's Word Quiz.
import { parseWordList, mergeWordList, isReady } from "./wordlist.js";
import { ProgressStore } from "./progress.js";
import { pickWords, readyCount } from "./selection.js";
import { buildQuiz, PROMPTS } from "./questions.js";
import { nextJoke } from "./jokes.js";
import { unlockAudio, playBoing, playCheer } from "./sounds.js";
import { fetchJson } from "./net.js";
import { saveToGitHub } from "./sync.js";

const LENGTHS = [5, 10, 15, 20, 30, 40, 50];
const SECONDS = 30;
const WORDS_KEY = "hoot.words.v1";
const GH_REPO = { owner: "suhaneyankita", repo: "hoot-word-quiz", path: "progress/progress.json" };
const GH_KEY = "hoot.github.key";
const GH_LAST = "hoot.github.last";
const GH_DIRTY = "hoot.github.dirty";
const GH_STATUS = "hoot.github.status";
const GREETINGS = [
  "Hello superstar! Ready to grow your word-brain? 🧠✨",
  "Hoot hoot! Let's learn some brilliant words today! 📚",
  "Welcome back, word wizard! 🪄",
  "Ready for a word adventure? 🚀",
];
const CHEERS = ["Hoot hoot! Brilliant!", "You're on fire! 🔥", "Wise owl! 🦉", "Super-duper! ⭐", "Spot on! 🎯", "Amazing! 🌈"];

const app = document.getElementById("app");
const store = new ProgressStore();
let wordList = { version: "", words: [] };
let jokes = [{ kind: "joke", text: "Why did the owl go to school? To become a little bit WISER!" }];
let newWords = 0;
let chosenLength = 10;
let quiz = null;
let timer = null;
let advance = null;
let screen = "loading";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const today = () => new Date().toLocaleDateString("en-CA");
const ready = () => wordList.words.filter(isReady);

function readStoredWords() {
  try { return parseWordList(JSON.parse(localStorage.getItem(WORDS_KEY))); } catch { return null; }
}

// Checks for a newer word list. Returns true if the words changed.
async function refreshData() {
  const current = wordList.version ? wordList : null;
  const incoming = parseWordList(await fetchJson("data/words.json"));
  let changed = false;
  if (incoming) {
    const merged = mergeWordList(current, incoming);
    if (merged.changed) {
      wordList = { version: merged.version, words: merged.words };
      newWords += merged.added.length;
      changed = true;
      try { localStorage.setItem(WORDS_KEY, JSON.stringify(wordList)); } catch { /* keep in memory */ }
    }
  }
  const j = await fetchJson("data/jokes.json");
  if (Array.isArray(j) && j.length) jokes = j;
  return changed;
}

// Back from the background (Home Screen apps are usually resumed, not relaunched): look for new words.
async function refreshOnStart() {
  navigator.serviceWorker?.getRegistration?.().then((r) => r?.update()).catch(() => {});
  syncProgress(); // anything that couldn't be saved earlier (e.g. the iPad was offline)
  if (await refreshData() && screen === "start") showStart();
}

// ---------- Start ----------

function showStart() {
  stopTimer();
  clearTimeout(advance);
  quiz = null;
  screen = "start";
  const count = readyCount(wordList.words);
  if (chosenLength > count) chosenLength = LENGTHS.filter((n) => n <= count).pop() ?? count;
  const statuses = ready().map((w) => store.get(w.word).status);
  const anyDisabled = LENGTHS.some((n) => n > count);
  let bubble = pick(GREETINGS);
  if (anyDisabled && count > 0) bubble += `<br>I've got ${count} words ready for you!`;
  if (count === 0) bubble = "Hoot! I don't have any words yet. Ask a grown-up to add some! 📝";

  app.innerHTML = `
    <div class="card">
      <div class="hoot" id="hoot" title="Grown-ups: press and hold">🦉</div>
      <div class="bubble">${bubble}</div>
      ${newWords ? `<div class="gift">🎁 ${newWords} new word${newWords === 1 ? "" : "s"} arrived!</div>` : ""}
      <h2>How many questions today?</h2>
      <div class="chips">
        ${LENGTHS.map((n) => `<button class="chip ${n === chosenLength ? "on" : ""}" data-n="${n}" ${n > count ? "disabled" : ""}>${n}</button>`).join("")}
      </div>
      <button class="big-btn" id="go" ${count === 0 ? "disabled" : ""}>Let's go! 🚀</button>
      <div class="stats">
        <span class="stat">📚 ${count} words</span>
        <span class="stat">🌱 ${statuses.filter((s) => s === "New").length} new</span>
        <span class="stat">💪 ${statuses.filter((s) => s === "Practise").length} to practise</span>
      </div>
    </div>`;

  app.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => {
    chosenLength = Number(b.dataset.n);
    app.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === b));
  }));
  app.querySelector("#go").addEventListener("click", () => { unlockAudio(); startQuiz(chosenLength); });
  setupLongPress(app.querySelector("#hoot"), showGrownUps);
}

function setupLongPress(el, action) {
  let t = null;
  const cancel = () => { clearTimeout(t); t = null; };
  el.addEventListener("pointerdown", () => { t = setTimeout(action, 2000); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => el.addEventListener(ev, cancel));
  el.addEventListener("contextmenu", (e) => e.preventDefault());
}

// ---------- Quiz ----------

function startQuiz(n) {
  newWords = 0;
  const chosen = pickWords(wordList.words, store, n);
  quiz = { questions: buildQuiz(chosen, ready()), index: 0, score: 0, missed: [], length: n };
  showQuestion();
}

function showQuestion() {
  const q = quiz.questions[quiz.index];
  const promptHtml = esc(q.prompt).replace(/(SAME|OPPOSITE|MEAN)/, "<b>$1</b>");
  const display = q.type === "gap"
    ? `<div class="sentence">${esc(q.display)}</div>`
    : `<div class="word">${esc(q.display)}</div>`;

  app.innerHTML = `
    <div class="card">
      <div class="top">
        <button class="home-btn" id="quit" aria-label="Home">🏠</button>
        <span>⭐ Question ${quiz.index + 1} of ${quiz.questions.length}</span>
        <div class="timer" id="timer"><span id="secs">${SECONDS}</span></div>
      </div>
      <div class="prompt">${promptHtml}</div>
      ${display}
      <div class="options">
        ${q.options.map((o, i) => `<button class="opt ${o.length > 28 ? "long" : ""}" data-i="${i}">${esc(o)}</button>`).join("")}
      </div>
      <div class="row" id="tellRow"><button class="btn tell" id="tell">🤔 Reveal pls</button></div>
      <div id="after"></div>
    </div>`;
  screen = "quiz";
  app.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => { unlockAudio(); answer(q.options[Number(b.dataset.i)]); }));
  app.querySelector("#tell").addEventListener("click", () => { unlockAudio(); answer(null, "asked"); });
  app.querySelector("#quit").addEventListener("click", showStart);
  startTimer(() => answer(null, "timeout"));
}

// how: "picked" (tapped an option), "timeout" (ran out of time) or "asked" (tapped Reveal pls; counts as wrong).
function answer(choice, how = "picked") {
  if (!quiz || quiz.answered) return;
  quiz.answered = true;
  stopTimer();
  const q = quiz.questions[quiz.index];
  const correct = choice === q.answer;
  store.record(q.word, correct, today());
  writeLocal(GH_DIRTY, "1");

  app.querySelectorAll(".opt").forEach((b) => {
    const opt = q.options[Number(b.dataset.i)];
    b.disabled = true;
    if (opt === q.answer) b.classList.add("right");
    else if (opt === choice || !correct) b.classList.add("faded");
  });

  app.querySelector("#tellRow")?.remove();
  const after = app.querySelector("#after");
  if (correct) {
    quiz.score += 1;
    playCheer();
    after.innerHTML = `<div class="cheer">${pick(CHEERS)}</div>`;
    advance = setTimeout(nextQuestion, 1200);
  } else {
    quiz.missed.push(q.word);
    // Asking is a good thing to do, so no "boing" for it.
    if (how !== "asked") playBoing();
    const title = { asked: "Good question! Here's the answer 💡", timeout: "Time's up! ⏰" }[how] ?? "Oopsie-daisy! Nearly there!";
    after.innerHTML = `
      <div class="explain">🦉 <b>${title}</b><br>${esc(q.explanation)}</div>
      <div class="row"><button class="btn" id="next">Next ➜</button></div>`;
    after.querySelector("#next").addEventListener("click", nextQuestion);
  }
}

function nextQuestion() {
  if (!quiz) return;
  quiz.answered = false;
  quiz.index += 1;
  if (quiz.index < quiz.questions.length) showQuestion();
  else showFinished();
}

// ---------- Timer ----------

function startTimer(onTimeout) {
  stopTimer();
  timer = { left: SECONDS * 1000, last: Date.now(), onTimeout, paused: false };
  timer.id = setInterval(tick, 200);
}

function tick() {
  if (!timer || timer.paused) return;
  const now = Date.now();
  timer.left -= now - timer.last;
  timer.last = now;
  const el = document.getElementById("timer");
  const secs = Math.max(0, Math.ceil(timer.left / 1000));
  if (el) {
    el.style.setProperty("--p", Math.max(0, timer.left / (SECONDS * 1000)));
    el.classList.toggle("hurry", secs <= 10);
    document.getElementById("secs").textContent = secs;
  }
  if (timer.left <= 0) {
    const done = timer.onTimeout;
    stopTimer();
    done();
  }
}

function stopTimer() {
  if (timer) clearInterval(timer.id);
  timer = null;
}

document.addEventListener("visibilitychange", () => {
  if (timer) {
    timer.paused = document.hidden;
    timer.last = Date.now();
  }
  if (!document.hidden && screen === "start") refreshOnStart();
});

// ---------- Finished ----------

function showFinished() {
  const total = quiz.questions.length;
  const ratio = total ? quiz.score / total : 0;
  const message = ratio >= 0.8 ? "You're a word wizard! 🪄" : ratio >= 0.5 ? "Great work, keep going! 🌟" : "Every try makes your brain stronger! 💪";
  const joke = nextJoke(jokes, store);
  const label = joke.kind === "fact" ? "🤓 Hoot's fun fact" : "😂 Hoot's joke of the day";
  const missed = [...new Set(quiz.missed)];

  app.innerHTML = `
    <div class="card">
      <div class="hoot">🦉</div>
      <p class="score">${quiz.score} / ${total}</p>
      <h2>${message}</h2>
      <div class="joke"><span class="label">${label}</span>${esc(joke.text)}</div>
      ${missed.length ? `<div class="missed">Words to peek at again:<br>${missed.map((w) => `<span class="pill">${esc(w)}</span>`).join("")}</div>` : ""}
      <div class="row">
        <button class="btn pink" id="again">Play again 🔁</button>
        <button class="btn" id="home">Home 🏠</button>
      </div>
    </div>`;
  const length = quiz.length;
  quiz = null;
  screen = "finished";
  app.querySelector("#again").addEventListener("click", () => { unlockAudio(); startQuiz(length); });
  app.querySelector("#home").addEventListener("click", showStart);
  confetti();
  syncProgress();
}

function confetti() {
  const box = document.getElementById("confetti");
  const bits = ["🎉", "✨", "⭐", "🎊", "💜", "💛", "🩷", "💙"];
  box.innerHTML = Array.from({ length: 36 }, () =>
    `<i style="left:${Math.random() * 100}%;animation-duration:${2.5 + Math.random() * 2}s;animation-delay:${Math.random() * 0.8}s">${pick(bits)}</i>`).join("");
  setTimeout(() => { box.innerHTML = ""; }, 5500);
}

// ---------- Grown-ups corner ----------

function showGrownUps() {
  stopTimer();
  screen = "grown";
  const listed = new Set(wordList.words.map((w) => w.word));
  const practise = Object.entries(store.words)
    .filter(([w, p]) => p.status === "Practise" && listed.has(w))
    .sort((a, b) => b[1].timesWrong - a[1].timesWrong);
  const updated = wordList.version ? new Date(wordList.version).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "never";

  app.innerHTML = `
    <div class="card grown">
      <h1>🔑 Grown-ups corner</h1>
      <p class="meta">Word list updated ${esc(updated)} · ${readyCount(wordList.words)} ready of ${wordList.words.length} words</p>
      <h2>Words to practise (${practise.length})</h2>
      <div class="list">
        ${practise.length ? `<table><tr><th>Word</th><th>Times wrong</th><th>Last seen</th></tr>
          ${practise.map(([w, p]) => `<tr><td>${esc(w)}</td><td>${p.timesWrong}</td><td>${esc(p.lastSeen ?? "")}</td></tr>`).join("")}</table>`
        : `<p style="text-align:center">Nothing to practise yet. 🎉</p>`}
      </div>
      <h2>Save progress to GitHub</h2>
      <div id="ghBox"></div>
      <div class="row">
        <button class="btn pink" id="send">Send progress to Mac 📤</button>
        <button class="btn" id="back">Back</button>
      </div>
      <p class="meta" id="sendNote"></p>
    </div>`;
  app.querySelector("#back").addEventListener("click", showStart);
  app.querySelector("#send").addEventListener("click", sendProgress);
  renderGitHubBox();
}

function renderGitHubBox(message = "") {
  const box = document.getElementById("ghBox");
  if (!box) return;
  const token = readLocal(GH_KEY);
  if (!token) {
    box.innerHTML = `
      <p class="meta">Paste a GitHub key that can only edit the <b>hoot-word-quiz</b> repository. Progress then saves itself after every quiz.</p>
      <div class="row"><input id="ghKey" class="key-input" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…">
      <button class="btn" id="ghConnect">Connect</button></div>
      <p class="meta">${esc(message)}</p>`;
    box.querySelector("#ghConnect").addEventListener("click", async () => {
      const key = box.querySelector("#ghKey").value.trim();
      if (!key) return;
      writeLocal(GH_KEY, key);
      renderGitHubBox("Connecting…");
      const res = await syncProgress(true);
      if (!res.ok && res.reason === "bad-key") {
        writeLocal(GH_KEY, null);
        renderGitHubBox("That key didn't work. Check it can edit hoot-word-quiz (Contents: Read and write).");
      } else {
        renderGitHubBox(res.ok ? "Connected and saved! ✅" : "Key saved. It will save when the iPad is online.");
      }
    });
    return;
  }
  const last = readLocal(GH_LAST);
  const when = last ? new Date(last).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "not yet";
  const bad = readLocal(GH_STATUS) === "bad-key";
  box.innerHTML = `
    <p class="meta">${bad ? "⚠️ The key isn't working any more (it may have expired). Remove it and paste a new one." : `✅ Connected · Last saved to GitHub: ${esc(when)}`}</p>
    <div class="row"><button class="btn" id="ghNow">Save now</button><button class="btn pink" id="ghRemove">Remove key</button></div>
    <p class="meta">${esc(message)}</p>`;
  box.querySelector("#ghNow").addEventListener("click", async () => {
    renderGitHubBox("Saving…");
    const res = await syncProgress(true);
    renderGitHubBox(res.ok ? "Saved! ✅" : res.reason === "offline" ? "No internet right now; it will try again later." : "Couldn't save just now.");
  });
  box.querySelector("#ghRemove").addEventListener("click", () => {
    writeLocal(GH_KEY, null);
    writeLocal(GH_STATUS, null);
    renderGitHubBox("Key removed from this iPad.");
  });
}

// ---------- Saving progress to GitHub ----------

function readLocal(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeLocal(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage blocked */ }
}

let syncing = null;

// Saves the progress file if there's something new (or when asked to), without ever bothering her.
function syncProgress(force = false) {
  if (syncing) return syncing;
  if (!readLocal(GH_KEY) || (!force && readLocal(GH_DIRTY) !== "1")) return Promise.resolve({ ok: false, reason: "nothing" });
  syncing = saveToGitHub({ ...GH_REPO, token: readLocal(GH_KEY), json: store.exportFile(today()) })
    .then((res) => {
      if (res.ok) {
        writeLocal(GH_LAST, new Date().toISOString());
        writeLocal(GH_DIRTY, null);
        writeLocal(GH_STATUS, null);
      } else if (res.reason === "bad-key") {
        writeLocal(GH_STATUS, "bad-key");
      }
      return res;
    })
    .finally(() => { syncing = null; });
  return syncing;
}

async function sendProgress() {
  const name = `hoot-progress-${today()}.json`;
  const blob = new Blob([JSON.stringify(store.exportFile(today()), null, 1)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  const note = document.getElementById("sendNote");
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Hoot progress" });
      note.textContent = "Sent! Ask Claude to update the spreadsheet with this file.";
      return;
    }
  } catch (e) {
    if (e?.name === "AbortError") return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  note.textContent = `Saved ${name}. Ask Claude to update the spreadsheet with this file.`;
}

// ---------- Boot ----------

navigator.storage?.persist?.().catch(() => {});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
const stored = readStoredWords();
if (stored) {
  // Start straight away from the saved words; pick up any new ones in the background.
  wordList = stored;
  showStart();
  refreshOnStart();
} else {
  app.innerHTML = `<div class="card"><div class="hoot">🦉</div><div class="bubble">Waking up Hoot…</div></div>`;
  refreshData().then(showStart);
}

// For quick checks in the browser console.
window.hoot = { store, get wordList() { return wordList; }, PROMPTS };
