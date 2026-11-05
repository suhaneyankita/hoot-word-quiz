# Hoot's Word Quiz: Design

Date: 2026-11-05 (revised: iPad web app)

## Intent and the why

A parent is building a vocabulary practice app for their child, who is preparing for the 11+ exam. Their word list (170 words so far, taken from their notebook and worksheets) is in `Word List.xlsx`. The app turns that list into short multiple-choice quizzes. It teaches them straight away when they get something wrong, and it keeps bringing back the words they struggle with until they know them.

It has to be something they *want* to open: bright, funny and gentle, with a small reward (a joke or fun fact) at the end of every quiz.

**They play on an iPad.** A native iPad app would need Xcode, which isn't installed, and either a paid Apple developer account or reinstalling every 7 days. So it is a **web app installed to the iPad Home Screen** (Safari → Share → Add to Home Screen). It opens full-screen with its own icon and works offline.

## Goals

- **An iPad Home Screen web app** that works **fully offline** once installed. There are no accounts, API keys or running costs.
- **Free hosting** on GitHub Pages under the parent's own GitHub account. Claude publishes it and every update from the Mac.
- **Multiple-choice quizzes,** with the length chosen before each quiz (**5 / 10 / 15 / 20 / 30 / 40 / 50**). Lengths longer than the number of quiz-ready words are greyed out.
- **Four question types,** each with 4 options:
  1. **Same meaning:** pick the synonym of the word.
  2. **Opposite:** pick the antonym of the word.
  3. **What does it mean?:** pick the correct meaning of the word.
  4. **Fill the gap:** a sentence with the word blanked out; pick the word that fits.
- **A 30-second timer** on each question. Running out of time counts as wrong.
- **Immediate feedback** after each answer:
  - **Wrong or timed out:** a "boing" sound, the correct answer highlighted, and Hoot explains the meaning (plus the example sentence where it helps). They tap **Next** when ready.
  - **Right:** a cheerful sound and a quick happy message.
- **End screen:** score, a celebratory message, **a joke or fun fact they haven't seen before**, and the list of words they missed.
- **Smart word selection:** about 50% of each quiz comes from words they have got wrong ("to practise"), and 50% from words that are new (never asked) or already passed.
- **New words arrive automatically.** Whenever the iPad is online, the app checks for an updated word list and adds new words. Their progress stays as it is.
- **Progress can be seen.** A "words to practise" view in the app lists the words they keep missing. A **"Send progress to Mac"** button shares a small progress file (by AirDrop, Messages or Files). Claude then writes Status and the counts into `Word List.xlsx` on request.

## How words get added (parent's decision)

New words are added **through Claude on the Mac**, not in the iPad app. The parent sends Claude a photo or a list, and Claude:

1. Reads the words.
2. Writes a child-friendly Meaning, Synonyms, Antonyms and a Sentence for each word.
3. Adds them to `Word List.xlsx`.
4. Regenerates the app's word list and republishes it.

This uses the parent's existing Claude subscription, at no extra cost. Because of this, **the iPad app has no Add words tab, no photo reading and no dictionary lookups.** *(This follows from the parent's last answers; flagged to confirm.)*

## Non-goals

- No Mac app. No native iPad app or App Store.
- No AI or paid services inside the app.
- No sharing progress live between devices, and no user accounts or multiple children.
- No spelling or typing questions. Multiple choice only.

## Anti-goals (would make it a failure even if it works)

- Feeling like a test paper: harsh red crosses, scary sounds or "WRONG!". Mistakes must feel friendly ("Oopsie-daisy! Nearly there!").
- A question with two correct-looking answers, or a wrong option that is actually a valid synonym.
- Losing their progress when the word list updates, or when the app is closed mid-quiz.
- Repeating the same joke over and over.
- Text or buttons too small for a child's fingers on an iPad.
- Anything personal on the public web page. Only words, jokes and the app are on the site. (The parent chose to keep `Word List.xlsx`, which can hold progress, in the public repo.)

## Look and feel (approved mockup)

The **"Sunny Candy" style with Professor Hoot the owl 🦉** was chosen and approved. The mockup is in `.superpowers/brainstorm/*/content/sunny-candy-final.html` (screens 1–4; screen 5, Add words, is now dropped).

- Warm pastel-yellow background (#FFF6D6) with white rounded cards.
- Four answer buttons, each a different bright colour: pink #FF8FAB, sky blue #4CC9F0, sunshine #FFB703, mint #80ED99. They are big, rounded and pressable.
- Purple (#7B3FE4) for the quiz word and the main buttons. Pink (#FF6B8B) for "Let's go!" and the timer ring.
- A rounded, playful font (Chalkboard SE, which comes with iPadOS), confetti on the end screen, and Hoot speaking in speech bubbles.
- Designed for an iPad in landscape and portrait. Touch targets are at least 56 px.

Screens: **Start** (greeting, question-count chips, "Let's go!", counters for total / new / to-practise) → **Question** → **Feedback** → **Finished** (score, joke/fact, missed words, Play again / Home). There is also a small **Grown-ups** corner reached from Start: words to practise, "Send progress to Mac", and the last word-list update date.

## Data

- **The master word list is `Word List.xlsx` on the Mac** (sheet `Words`: No., Word, Meaning, Synonyms, Antonyms, Sentence, Status, Times asked, Times wrong, Correct in a row, Last seen). It has been filled for all 170 words.
- **What gets published:** a `words.json` generated from the spreadsheet (word, meaning, synonyms, antonyms, sentence) plus a version stamp. It is bundled with the app, so a fresh install works offline straight away.
- **Progress lives on the iPad** in browser storage (IndexedDB/localStorage), keyed by word. It holds status, times asked, times wrong, correct in a row, last seen and jokes seen.
- **iPad storage risk:** Safari can clear website data that hasn't been used for a long time. A Home Screen app is protected from this, but the app should also ask for persistent storage. *(The "Send progress to Mac" file doubles as a backup.)*
- **Updating words:** when online, the app fetches `words.json`. If the version is newer, new words are added and existing words' details are updated. Progress is never reset. Words removed from the list are hidden from quizzes, but their progress is kept.

Rules:
- **Quiz-ready:** a word needs a Meaning and a Sentence that contains the word (whole word, any case).
  - A missing antonym only means no "Opposite" question (parent's decision).
  - A missing synonym only means no "Same meaning" question *(my call)*.
- **Status:**
  - New → Passed on a correct answer.
  - Any status → Practise on a wrong answer or timeout.
  - Practise → Passed after **2 correct answers in a row** *(my call)*.
- Progress is saved after **every answer**.

## Word selection for a quiz of N questions

- Pool A = `Practise` words, most-missed and least-recently-seen first. Pool B = `New` words first, then `Passed` words seen longest ago.
- Take N/2 from A and the rest from B. If one pool is short, fill from the other.
- If fewer than N words are ready, the quiz is shorter and Hoot says so.
- No word appears twice in one quiz. Question types are mixed so that no single type makes up more than half the quiz.

## Building the wrong options

- **Never a second right answer:** a wrong option is never one of the word's own synonyms. It is also never a list word whose synonyms include this word (e.g. *sociable* is never a wrong option for *gregarious*, and *summit* never for *apex*).
- **Same meaning:** the answer is one of its synonyms. Wrong options come from other words or their synonyms. Include one antonym as a trap when one exists.
- **Opposite:** the answer is one of its antonyms. Wrong options come from its synonyms and other words.
- **What does it mean?:** the answer is its meaning. Wrong options are other words' meanings.
- **Fill the gap:** the answer is the word. Wrong options are other list words.
- There are always 4 unique options, in shuffled order.

## Jokes and fun facts

- At least 150 child-friendly jokes and fun facts, written ahead of time and bundled with the app.
- No repeat until all have been shown.

## How it gets made (my calls)

- **A static web app:** plain HTML/CSS/JavaScript with no framework, plus a web app manifest (owl icon, full-screen) and a service worker that caches everything for offline use.
- **Sounds:** made with the Web Audio API, so there are no sound files. iPad sound starts after the first tap, so the first sound is enabled when they tap "Let's go!".
- **Testing:** the quiz logic (selection, questions, status rules, merging updates) is in plain JS modules tested with Node's built-in test runner.
- **Publishing:** a small script on the Mac turns `Word List.xlsx` into `words.json`, then commits and pushes to the GitHub Pages repository.
- **Progress import:** a small script on the Mac reads the "Send progress" file and writes the progress columns into the spreadsheet.

## Constraints

- Works offline after the first install. Internet is used only to check for word updates.
- No cost beyond the parent's existing Claude subscription.
- Hosted under the parent's own GitHub account.

## Left to the builder

- Exact animations, right-answer feedback and the wording of Hoot's messages (in the spirit of the mockup).
- The format of the progress file, and how the Grown-ups corner is reached (e.g. a long-press on Hoot so they don't wander in).
- Code structure and the test layout.

## Open items

- The parent is creating a personal GitHub account; Claude needs the username and a one-time sign-in on this Mac.
- Confirm: no Add words tab on the iPad, because all new words come through Claude.
- Where the project folder lives on the Mac (it's still in the temporary session folder).
