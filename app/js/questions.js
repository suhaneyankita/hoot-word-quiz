// Building multiple-choice questions with exactly one right answer.
import { blankSentence, isReady } from "./wordlist.js";
import { shuffle } from "./selection.js";

export const PROMPTS = {
  synonym: "Pick the word that means the SAME as",
  antonym: "Find the word that means the OPPOSITE of",
  meaning: "What does this word MEAN?",
  gap: "Which word fits the gap?",
};

const lower = (s) => s.toLowerCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function availableTypes(w) {
  const types = ["meaning", "gap"];
  if (w.synonyms.length) types.push("synonym");
  if (w.antonyms.length) types.push("antonym");
  return types;
}

// A candidate that could also be a right answer for "same meaning" or "fits the gap".
export function isUnsafe(candidate, w, allWords) {
  const c = lower(candidate);
  const synonyms = w.synonyms.map(lower);
  if (c === lower(w.word) || synonyms.includes(c)) return true;
  return allWords.some((o) => lower(o.word) === c &&
    o.synonyms.some((s) => lower(s) === lower(w.word) || synonyms.includes(lower(s))));
}

// A candidate that could also be a right answer for "opposite".
function isOpposite(candidate, w, allWords) {
  const c = lower(candidate);
  const antonyms = w.antonyms.map(lower);
  if (antonyms.includes(c)) return true;
  return allWords.some((o) => lower(o.word) === c &&
    (o.antonyms.some((a) => lower(a) === lower(w.word)) || o.synonyms.some((s) => antonyms.includes(lower(s)))));
}

function pickDistractors(pool, answer, rand, required = []) {
  const seen = new Set([lower(answer)]);
  const out = [];
  for (const c of [...required, ...shuffle(pool, rand)]) {
    if (out.length === 3) break;
    if (!c || seen.has(lower(c))) continue;
    seen.add(lower(c));
    out.push(c);
  }
  return out.length === 3 ? out : null;
}

export function buildQuestion(w, type, allWords, rand = Math.random) {
  const others = allWords.filter((o) => lower(o.word) !== lower(w.word));
  const pick = (list) => list[Math.floor(rand() * list.length)];
  let answer, distractors;

  if (type === "synonym") {
    answer = pick(w.synonyms);
    // Synonyms of an unsafe word are near-synonyms of this word too, so skip them all.
    const pool = others
      .filter((o) => !isUnsafe(o.word, w, allWords))
      .flatMap((o) => [o.word, ...o.synonyms])
      .filter((c) => !isUnsafe(c, w, allWords));
    const trap = w.antonyms.length ? [pick(w.antonyms)] : [];
    distractors = pickDistractors(pool, answer, rand, trap);
  } else if (type === "antonym") {
    answer = pick(w.antonyms);
    const pool = [...w.synonyms, ...others.map((o) => o.word)].filter((c) => !isOpposite(c, w, allWords));
    distractors = pickDistractors(pool, answer, rand);
  } else if (type === "meaning") {
    answer = w.meaning;
    const pool = others.filter((o) => o.meaning && !isUnsafe(o.word, w, allWords)).map((o) => o.meaning);
    distractors = pickDistractors(pool, answer, rand);
  } else if (type === "gap") {
    answer = w.word;
    const pool = others.filter((o) => isReady(o) && !isUnsafe(o.word, w, allWords)).map((o) => o.word);
    distractors = pickDistractors(pool, answer, rand);
  }
  if (!distractors) return null;

  const explanation = `${cap(w.word)} means ${w.meaning}.` + (type === "gap" ? "" : ` "${w.sentence}"`);
  return {
    word: w.word,
    type,
    prompt: PROMPTS[type],
    display: type === "gap" ? blankSentence(w) : w.word,
    options: shuffle([answer, ...distractors], rand),
    answer,
    explanation,
  };
}

export function buildQuiz(chosen, allWords, rand = Math.random) {
  const counts = { synonym: 0, antonym: 0, meaning: 0, gap: 0 };
  const quiz = [];
  for (const w of chosen) {
    const types = shuffle(availableTypes(w), rand).sort((a, b) => counts[a] - counts[b]);
    for (const type of types) {
      const q = buildQuestion(w, type, allWords, rand);
      if (q) {
        counts[type] += 1;
        quiz.push(q);
        break;
      }
    }
  }
  return quiz;
}
