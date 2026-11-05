# Hoot's Word Quiz (iPad) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An offline iPad Home Screen web app that runs child-friendly multiple-choice vocabulary quizzes from their word list. It tracks their progress on the iPad and picks up new words that Claude publishes from the Mac.

**Architecture:** The app is a static site in `app/`, built from plain ES modules. The pure logic (word list, progress rules, selection, questions, jokes) lives in modules with no DOM access and is tested with `node --test`. `main.js` drives the screens, and a service worker caches everything for offline use. On the Mac, Python tools turn `Word List.xlsx` into `app/data/words.json`, import their progress file back into the spreadsheet, and publish to GitHub Pages.

**Tech Stack:**
- **App:** HTML/CSS/vanilla JS (ES modules), Web App Manifest, Service Worker, Web Audio, Web Share API.
- **Tests:** Node 24 (`node --test`).
- **Mac tools:** Python 3.14 + openpyxl (in `.venv`), git + `gh` for publishing.

**Spec:** `docs/superpowers/specs/2026-11-05-hoots-word-quiz-design.md`

## Global Constraints

- **iPad only:** Safari → Add to Home Screen. Works fully offline after the first load. Supports landscape and portrait. Touch targets are at least 56 px and text at least 16 px.
- **Look:** "Sunny Candy" with Professor Hoot 🦉. Background `#FFF6D6`; answer buttons `#FF8FAB`, `#4CC9F0`, `#FFB703`, `#80ED99`; word and main buttons `#7B3FE4`; "Let's go!" and timer ring `#FF6B8B`. Font: `"Chalkboard SE", "Comic Sans MS", sans-serif`. Reference: `.superpowers/brainstorm/*/content/sunny-candy-final.html`, screens 1–4.
- **Quiz lengths:** `[5, 10, 15, 20, 30, 40, 50]`. Lengths longer than the number of ready words are greyed out.
- **Questions:** 4 options each, 30-second timer, and a timeout counts as wrong.
- **Question prompts (exact copy):**
  - synonym: "Pick the word that means the SAME as"
  - antonym: "Find the word that means the OPPOSITE of"
  - meaning: "What does this word MEAN?"
  - gap: "Which word fits the gap?"
- **Wording:** mistakes are friendly ("Oopsie-daisy! Nearly there!", "Time's up! ⏰"). Never "WRONG".
- **Quiz-ready:** a word needs a meaning and a sentence containing the word (whole word, any case). No antonyms → no antonym question; no synonyms → no synonym question.
- **Status:** New → Passed on a correct answer. Any status → Practise on a wrong answer or timeout. Practise → Passed after 2 correct in a row.
- **Selection:** about half Practise words, half New + Passed. If one pool runs short, fill from the other. No repeats within a quiz. No question type makes up more than half the quiz when alternatives exist.
- **Saving:** progress is saved after every answer. A word-list update never resets progress.
- **Publishing:** nothing personal is published. Only the app, `words.json` and `jokes.json`.
- **Jokes:** at least 150, with no repeat until all have been shown.
- **Hosting:** the parent's own GitHub account. Repo `hoot-word-quiz`, GitHub Pages serving the `app/` folder (via a `gh-pages` branch or a Pages workflow, builder's call).
- **Commits:** prefixes `feat:` / `fix:` / `chore:`, no Claude attribution.

## Review Focus

1. **Word-list update while progress exists:** after an update with new words, changed meanings and one removed word, old progress is untouched, new words are `New`, and the removed word never appears in a quiz. Test in Task 2.
2. **Fewer ready words than the chosen length** (e.g. 50 chosen, 12 ready): the quiz has 12 questions and the Start screen greys out the bigger chips. Test in Task 4 (logic) and Task 7 (UI check).
3. **The sentence uses another form of the word, or the word sits inside a longer word** ("abhorred", "rant" in "grant"): only a whole-word match is blanked. Otherwise the word isn't ready. Test in Task 2.
4. **The app is closed mid-quiz, or storage is unavailable or corrupt:** answers already given are kept. A corrupt saved JSON is ignored, and a backup copy is kept under `hoot.progress.bad`, so the app still starts. Test in Task 3.
5. **The iPad is offline, or `words.json` fails to fetch or is malformed:** the app quietly keeps the cached word list and never shows an error to them. Test in Task 2 (malformed input) and Task 8 (offline check).

---

## File Structure

```
app/                          # everything published
  index.html  style.css  manifest.webmanifest  sw.js
  icons/icon-180.png  icons/icon-512.png
  js/wordlist.js   # parse/validate words.json, isReady, blankSentence, mergeWordList
  js/progress.js   # status rules + ProgressStore over an injectable storage
  js/selection.js  # pickWords
  js/questions.js  # buildQuestion, buildQuiz, safe distractors
  js/jokes.js      # nextJoke
  js/sounds.js     # playBoing, playCheer, unlockAudio
  js/main.js       # screens, timer, update check, grown-ups corner, share progress
  data/words.json  data/jokes.json
tools/
  export_words.py      # Word List.xlsx → app/data/words.json
  import_progress.py   # progress file → Word List.xlsx progress columns
  publish.sh           # export → bump sw cache version → commit → push
tests/
  helpers.mjs  wordlist.test.mjs  progress.test.mjs  selection.test.mjs
  questions.test.mjs  jokes.test.mjs
  test_export_words.py  test_import_progress.py
package.json          # {"type":"module","scripts":{"test":"node --test tests/"}}
```

---

### Task 1: Project setup and word export

**Files:**
- Create: `package.json`, `.gitignore` (`.venv/`, `__pycache__/`, `.superpowers/`), `tools/export_words.py`, `tests/test_export_words.py`
- Output: `app/data/words.json`

**Interfaces:**
- Produces:
  - **`words.json` shape:** `{"version": "<ISO-8601 UTC timestamp>", "words": [{"word": str, "meaning": str, "synonyms": [str], "antonyms": [str], "sentence": str}]}`. Words are lowercase and trimmed. Lists are split on commas with empties dropped. Spreadsheet rows with a blank Word are skipped.
  - **`tools/export_words.py`:** `export(xlsx: Path, out: Path, now: datetime) -> int` returns the number of words written. The CLI is `python tools/export_words.py "Word List.xlsx" app/data/words.json`. Columns are found by header name.

- [ ] **Step 1:** Run `git init`. Create a venv and install dependencies with `python3 -m venv .venv && .venv/bin/pip install openpyxl pytest`. Add `package.json` and `.gitignore`.
- [ ] **Step 2: Write failing tests** in `tests/test_export_words.py`:
  - `test_export_shape`: a tmp xlsx with 3 rows (one with blank antonyms, one with a blank Word) → returns 2. The JSON has `version`, and `words[0]["synonyms"] == ["sociable", "outgoing", "friendly"]`. Blank antonyms become `[]`.
  - `test_export_real_sheet`: exporting `Word List.xlsx` gives 170 words with unique names.
- [ ] **Step 3:** Run `.venv/bin/pytest tests/test_export_words.py -v`. Expected: FAIL.
- [ ] **Step 4:** Implement `export`.
- [ ] **Step 5:** Run the tests (expected: PASS), then run the CLI to produce `app/data/words.json`.
- [ ] **Step 6:** Commit `chore: project setup and word export`, including the spec, the plan and `Word List.xlsx`.

### Task 2: Word list logic

**Files:** Create `app/js/wordlist.js`, `tests/helpers.mjs` (a sample word list of about 14 full words, including gregarious and sociable, which cross-reference each other, plus annual with no antonyms, mandolin with no synonyms, abhor with the sentence "She abhorred mess.", and rant with "They grant a rant."), `tests/wordlist.test.mjs`

**Interfaces:**
- Produces (ES module exports):
  - `parseWordList(json: unknown) -> {version: string, words: Word[]} | null`. Returns null if the shape is invalid. Entries with no `word` are dropped. A `Word` is `{word, meaning, synonyms, antonyms, sentence}`.
  - `wordInSentence(word: string, sentence: string) -> boolean`: whole word, case-insensitive. Escape regex characters.
  - `blankSentence(w: Word) -> string | null`: replaces the first match with `"______"`.
  - `isReady(w: Word) -> boolean`: true when the meaning is non-empty and `blankSentence(w) !== null`.
  - `mergeWordList(current: {version, words} | null, incoming: {version, words}) -> {version, words, changed: boolean}`. If `incoming.version` is newer, incoming replaces the words; otherwise current is kept. Progress lives separately, so merging only replaces the list. Words dropped from incoming disappear from the list, and their progress stays in the store.

- [ ] **Step 1: Write failing tests:**
  - `blank whole word only`: rant → `"They grant a ______."`; abhor → `null`; `isReady(abhor) === false`.
  - `isReady ignores missing antonyms and synonyms`: annual and mandolin → true.
  - `parseWordList rejects malformed`: `parseWordList({nope: 1}) === null`, `parseWordList("x") === null`.
  - `merge keeps newer only`: an older incoming version → `changed === false`; a newer one with a word removed and a word added → `changed === true`, the removed word is absent, and the new word is present.
- [ ] **Step 2:** Run `node --test tests/wordlist.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Implement `wordlist.js`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat: word list parsing, readiness and merge`.

### Task 3: Progress store

**Files:** Create `app/js/progress.js`, `tests/progress.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `class ProgressStore`:
    - `constructor(storage = globalThis.localStorage, key = "hoot.progress.v1")`. The storage is any object with `getItem` and `setItem`.
    - `get(word) -> {status: "New"|"Practise"|"Passed", timesAsked, timesWrong, correctInARow, lastSeen: string|null}`: lowercase key; returns a default for unknown words.
    - `record(word, correct: boolean, today: string /* YYYY-MM-DD */) -> same shape`: applies the status rules and saves immediately.
    - `jokesSeen: number[]` and `markJokeSeen(i)`, `resetJokes()`
    - `exportFile(today) -> {app: "hoot-word-quiz", exported: today, words: {...}, jokesSeen}`
  - On load, invalid JSON is copied to `hoot.progress.bad` and the store starts empty. `setItem` throwing (storage full or blocked) is caught, so the in-memory state stays correct.

- [ ] **Step 1: Write failing tests**, using a `Map`-backed fake storage:
  - `new correct → Passed`, `wrong → Practise`, `Practise needs two in a row` (wrong, right → Practise; right → Passed).
  - `saves after every record`: a new store over the same storage sees the same values.
  - `corrupt storage` (Review Focus 4): storage holds `"{bad"` → the constructor doesn't throw, `get("x").status === "New"`, and `hoot.progress.bad === "{bad"`.
  - `setItem throws`: `record` still returns the updated progress.
  - `exportFile shape`: has `app === "hoot-word-quiz"` and the recorded word.
- [ ] **Step 2:** Run `node --test tests/progress.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Implement `progress.js`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat: progress store with status rules`.

### Task 4: Word selection

**Files:** Create `app/js/selection.js`, `tests/selection.test.mjs`

**Interfaces:**
- Consumes: `isReady` (Task 2); `ProgressStore.get` (Task 3).
- Produces:
  - `pickWords(words: Word[], store, n: number, rand = Math.random) -> Word[]`:
    - Only ready words are picked.
    - Pool A is Practise words, sorted by timesWrong descending, then lastSeen oldest first (null first).
    - Pool B is New words (shuffled), then Passed words by lastSeen oldest first.
    - Take `Math.floor(n/2)` from A and the rest from B, topping up from the other pool when one is short. Shuffle the result. Length is `min(n, ready count)`.
  - `readyCount(words: Word[]) -> number`
  - `shuffle(arr, rand) -> arr`: Fisher–Yates on a copy. Task 5 reuses it.

- [ ] **Step 1: Write failing tests**, with 30 synthetic ready words and a seeded `rand` (mulberry32 in `helpers.mjs`):
  - `half from practise`: 8 Practise, n=10 → exactly 5 Practise.
  - `tops up`: 2 Practise, n=10 → 2 Practise + 8 others, all distinct.
  - `prefers most missed`: Practise words with timesWrong 5, 1 and 3, n=2 → includes the timesWrong 5 word.
  - `short quiz` (Review Focus 2): 12 ready, n=50 → length 12, all distinct.
  - `skips not ready`.
- [ ] **Step 2:** Run `node --test tests/selection.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Implement `selection.js`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat: 50/50 word selection`.

### Task 5: Question building

**Files:** Create `app/js/questions.js`, `tests/questions.test.mjs`

**Interfaces:**
- Consumes: `blankSentence` (Task 2); `shuffle` (Task 4).
- Produces:
  - `PROMPTS = {synonym, antonym, meaning, gap}`: the exact copy from Global Constraints.
  - `availableTypes(w) -> string[]`: `meaning` and `gap` always (for ready words), `synonym` if it has synonyms, `antonym` if it has antonyms.
  - `isUnsafe(candidate, w, allWords) -> boolean`: true if the candidate equals the word or one of its synonyms (case-insensitive), or is a list word whose synonyms include `w.word`.
  - `buildQuestion(w, type, allWords, rand) -> {word, type, prompt, display, options: string[4], answer, explanation} | null`:
    - `display` is the word, or the blanked sentence for `gap`.
    - `explanation` is `` `${Cap(word)} means ${meaning}.` ``, plus `` ` "${sentence}"` `` unless the type is gap.
    - Returns null if fewer than 3 safe distractors exist.
  - `buildQuiz(chosen, allWords, rand) -> Question[]`: chooses a type for each word so that no type is more than `ceil(n/2)` of the quiz when alternatives exist. If `buildQuestion` returns null, it tries the word's other types.
- **Option rules:**
  - **synonym:** answer = a random synonym. Distractors are other words or their synonyms, filtered by `!isUnsafe`. Include one of the word's antonyms as a trap when one exists.
  - **antonym:** answer = a random antonym. Distractors are its synonyms plus other words, never its other antonyms.
  - **meaning:** answer = its meaning. Distractors are other words' meanings.
  - **gap:** answer = the word. Distractors are other list words that pass `!isUnsafe`.
  - Always 4 options, unique case-insensitively, shuffled.

- [ ] **Step 1: Write failing tests:**
  - `sociable never a distractor for gregarious`: 300 seeded synonym builds for gregarious → "sociable" only ever appears as the answer.
  - `four unique options with answer`: every helper word × every available type → 4 unique options that include the answer.
  - `prompts exact`: `PROMPTS.gap === "Which word fits the gap?"` and the other three.
  - `availableTypes`: annual has no `antonym`; mandolin is `["meaning","gap"]`.
  - `type mix`: 10 full words → no type appears more than 5 times.
- [ ] **Step 2:** Run `node --test tests/questions.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Implement `questions.js`.
- [ ] **Step 4:** Run the tests (expected: PASS). Then run a sanity check over the real data: a small script builds every available type for all 170 words in `app/data/words.json` and checks that none return null when a type was available, or lists the ones that do.
- [ ] **Step 5:** Commit `feat: question builder with safe wrong options`.

### Task 6: Jokes

**Files:** Create `app/data/jokes.json`, `app/js/jokes.js`, `tests/jokes.test.mjs`

**Interfaces:**
- Consumes: `ProgressStore.jokesSeen`, `markJokeSeen`, `resetJokes` (Task 3).
- Produces: `nextJoke(jokes: {kind: "joke"|"fact", text: string}[], store, rand) -> {kind, text}`. It picks an index not yet seen and marks it seen. When all have been seen, it resets and picks again.

- [ ] **Step 1:** Write `jokes.json` with **at least 150** entries: a mix of jokes (owl and word jokes welcome) and fun facts (animals, space, the human body). Each is under 200 characters and suitable for a child preparing for the 11+.
- [ ] **Step 2: Write failing tests:**
  - `at least 150 unique`: reads the real file.
  - `no repeat until exhausted`: 3 fake jokes → the first 3 calls are all different, and the 4th still returns a joke.
- [ ] **Step 3:** Run `node --test tests/jokes.test.mjs`. Expected: FAIL.
- [ ] **Step 4:** Implement `jokes.js`.
- [ ] **Step 5:** Run the tests. Expected: PASS.
- [ ] **Step 6:** Commit `feat: jokes and fun facts`.

### Task 7: The interface

**Files:** Create `app/index.html`, `app/style.css`, `app/js/sounds.js`, `app/js/main.js`

**Interfaces:**
- Consumes: all of the modules above. `main.js` loads `data/words.json` and `data/jokes.json` with `fetch`. It keeps the last good word list in localStorage under `hoot.words.v1`, merging with `mergeWordList` and falling back to that stored copy when a fetch fails or `parseWordList` returns null.
- **Screens** (match mockup screens 1–4):
  - **Start:**
    - Hoot greeting bubble.
    - Chips for `[5,10,15,20,30,40,50]`, with chips above `readyCount` disabled and greyed. When any chip is disabled, Hoot's bubble adds "I've got N words ready for you!".
    - "Let's go! 🚀" (its tap also calls `unlockAudio()`).
    - Counters: 📚 total ready, 🌱 new, 💪 to practise.
    - If a word update just arrived: "🎁 N new words arrived!".
  - **Question:**
    - "⭐ Question i of n".
    - A conic-gradient timer ring from 30 down to 0. Under 10 seconds the ring wobbles gently.
    - The prompt, then the word (purple, 40px) or the blanked sentence in a lilac card.
    - A 2×2 grid of coloured option buttons.
  - **Feedback:**
    - Right: `playCheer()`, a green outline on the answer, a random cheer line ("Hoot hoot! Brilliant!", "You're on fire! 🔥", "Wise owl! 🦉", "Super-duper! ⭐"), then auto-advance after 1.2 s.
    - Wrong or timeout: `playBoing()`, the chosen button fades, the answer gets a green outline, and Hoot's dashed card shows "Oopsie-daisy! Nearly there!" or "Time's up! ⏰" plus the explanation. Then a **Next ➜** button.
    - `store.record(...)` runs immediately in both cases.
  - **Finished:**
    - A CSS confetti fall and the score `x / n`.
    - A message by score band: ≥80% "You're a word wizard! 🪄"; ≥50% "Great work, keep going! 🌟"; otherwise "Every try makes your brain stronger! 💪".
    - The joke card: "😂 Hoot's joke of the day" or "🤓 Hoot's fun fact".
    - Missed words as pills.
    - **Play again 🔁** (same length) and **Home 🏠**.
  - **Grown-ups corner** (long-press Hoot on Start for 2 s):
    - A list of Practise words with their timesWrong, most missed first.
    - Word-list version date and ready / total counts.
    - **Send progress to Mac 📤**: `navigator.share({files: [new File([JSON.stringify(store.exportFile(today))], "hoot-progress-YYYY-MM-DD.json", {type: "application/json"})]})`. If sharing files isn't supported, fall back to a download link.
    - A Back button.
- **`sounds.js`:**
  - `unlockAudio()` creates or resumes a shared `AudioContext`.
  - `playBoing()`: a sine wave sweeping 400→120 Hz over 0.35 s.
  - `playCheer()`: a triangle-wave arpeggio of C5 E5 G5 C6, 0.08 s per note.
- **Timer:** stops on answer. Leaving the page (`visibilitychange` to hidden) pauses it, so switching apps doesn't count as a timeout.
- Ask for persistent storage with `navigator.storage?.persist?.()` once on load.

- [ ] **Step 1:** Build `index.html`, `style.css`, `sounds.js` and `main.js`. Use the viewport meta `width=device-width, initial-scale=1, viewport-fit=cover`, disable double-tap zoom on buttons (`touch-action: manipulation`), and avoid hover-only effects.
- [ ] **Step 2:** Serve locally with `python3 -m http.server 8765 -d app`. In the browser pane, emulate an iPad (1024×768 and 768×1024) and play: a 5-question quiz with one wrong answer and one timeout, the finished screen and joke, the greyed chips (temporarily edit the local storage list down to 12 ready words), and the Grown-ups corner. Expected: everything behaves as described, with no console errors.
- [ ] **Step 3:** Take screenshots of Start, Question, Wrong, Finished and Grown-ups for the parent.
- [ ] **Step 4:** Commit `feat: Sunny Candy iPad interface`.

### Task 8: Offline install (manifest, icons, service worker)

**Files:** Create `app/manifest.webmanifest`, `app/sw.js`, `app/icons/icon-180.png`, `app/icons/icon-512.png`; modify `app/index.html` (manifest link, `apple-touch-icon`, `apple-mobile-web-app-capable`, `theme-color #FFF6D6`, and `navigator.serviceWorker.register("sw.js")`).

**Interfaces:**
- **`sw.js`:**
  - `const CACHE = "hoot-v<N>"`. `tools/publish.sh` bumps N.
  - On install, it pre-caches every app file (html, css, js, json, icons).
  - Requests for `data/words.json` are network-first, falling back to the cache. Everything else is cache-first.
  - On activate, it deletes old caches.
- **Manifest:** `name` "Hoot's Word Quiz", `short_name` "Hoot Quiz", `display` "standalone", `background_color` and `theme_color` `#FFF6D6`, both icons.
- **Icons:** a 🦉 on `#FFF6D6` with rounded padding, rendered with Pillow using the Apple Color Emoji font at size 160 and scaled. Add Pillow to the venv.

- [ ] **Step 1:** Create the manifest, icons and `sw.js`, and update `index.html`.
- [ ] **Step 2:** Serve locally and open in the browser pane. Check that the service worker is registered and the cache lists every file. Then stop the local server, reload, and confirm the app still loads and plays a quiz (Review Focus 5). Expected: it works offline with no errors.
- [ ] **Step 3:** Commit `feat: offline install support`.

### Task 9: Mac tools (progress import and publishing)

**Files:** Create `tools/import_progress.py`, `tools/publish.sh`, `tests/test_import_progress.py`, `README.md` (a short parent guide: install on the iPad, send progress, ask Claude to add words)

**Interfaces:**
- Consumes: the progress file shape from Task 3 (`exportFile`); the `words.json` shape from Task 1.
- Produces:
  - **`import_progress(progress_file: Path, xlsx: Path) -> tuple[int, list[str]]`:** returns `(rows_updated, unknown_words)`. It writes the Status, Times asked, Times wrong, Correct in a row and Last seen columns. It rejects files whose `app` isn't `"hoot-word-quiz"` with a `ValueError`. CLI: `python tools/import_progress.py <file> "Word List.xlsx"`.
  - **`tools/publish.sh`:**
    - Runs `export_words.py` and bumps `CACHE` in `app/sw.js`.
    - Runs the tests (`node --test tests/` and `.venv/bin/pytest -q`) and stops if they fail.
    - Commits `chore: update word list` and pushes. GitHub Pages then serves `app/`.
    - The first run creates the repo with `gh repo create hoot-word-quiz --public` under the **personal** account and enables Pages. It checks that `gh auth status` shows the personal account username before pushing, and refuses otherwise.

- [ ] **Step 1: Write failing tests:**
  - `test_import_updates_columns`: a progress file that marks "timid" as Practise with timesWrong 2 → the xlsx row for timid shows `Practise` and `2`, and the result is `(1, [])`.
  - `test_import_rejects_foreign_file`: `{"app": "other"}` raises a `ValueError`.
  - `test_import_reports_unknown`: a word that's not in the sheet appears in `unknown_words`.
- [ ] **Step 2:** Run `.venv/bin/pytest tests/test_import_progress.py -v`. Expected: FAIL.
- [ ] **Step 3:** Implement `import_progress.py`, `publish.sh` and `README.md`.
- [ ] **Step 4:** Run the tests (expected: PASS). Then run `bash tools/publish.sh --dry-run`, which does everything except the commit and push. Expected: the export count is 170, the cache version is bumped, and the tests pass.
- [ ] **Step 5:** Commit `feat: progress import and publish tools`.

### Task 10: Go live (needs the parent)

- [ ] **Step 1:** The parent signs in once on this Mac with `gh auth login` to the **personal** account. Claude doesn't enter credentials. Confirm with `gh auth status`.
- [ ] **Step 2:** Run `bash tools/publish.sh`. Expected: the repo is created, Pages is enabled, and `https://<username>.github.io/hoot-word-quiz/` loads in the browser pane.
- [ ] **Step 3:** The parent opens the address on the iPad in Safari → Share → Add to Home Screen, opens it from the icon, turns on Aeroplane Mode and plays a quiz. Expected: it works offline.
