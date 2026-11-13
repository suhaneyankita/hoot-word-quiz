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

const overlaps = (list, set) => list.some((x) => set.has(lower(x)));

// Everything that means roughly the same as w, and everything that means roughly the opposite,
// judged from w's own lists and from how other list words relate to it.
function relations(w, allWords) {
  const self = lower(w.word);
  const syn = new Set([self, ...w.synonyms.map(lower)]);
  const ant = new Set(w.antonyms.map(lower));
  const near = new Set(syn);
  const opposite = new Set(ant);
  for (const o of allWords) {
    const word = lower(o.word);
    if (word === self) continue;
    if (syn.has(word) || overlaps(o.synonyms, syn) || overlaps(o.antonyms, ant)) {
      near.add(word);
      o.antonyms.forEach((a) => opposite.add(lower(a)));
    }
    if (ant.has(word) || overlaps(o.antonyms, syn) || overlaps(o.synonyms, ant)) opposite.add(word);
  }
  // A word meaning the same as an opposite is an opposite too (sociable ≈ gregarious, the opposite of timid).
  for (const o of allWords) {
    const word = lower(o.word);
    if (word !== self && !near.has(word) && overlaps(o.synonyms, opposite)) opposite.add(word);
  }
  return { near, opposite };
}

// A candidate that could also be a right answer for "same meaning" or "fits the gap".
export function isUnsafe(candidate, w, allWords) {
  return relations(w, allWords).near.has(lower(candidate));
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
  const { near, opposite } = relations(w, allWords);
  const isNear = (c) => near.has(lower(c));
  const isOpposite = (c) => opposite.has(lower(c));
  let answer, distractors;

  if (type === "synonym") {
    answer = pick(w.synonyms);
    // Synonyms of a near word are near-synonyms of this word too, so skip them all.
    const pool = others.filter((o) => !isNear(o.word)).flatMap((o) => [o.word, ...o.synonyms]).filter((c) => !isNear(c));
    const trap = w.antonyms.length ? [pick(w.antonyms)] : [];
    distractors = pickDistractors(pool, answer, rand, trap);
  } else if (type === "antonym") {
    answer = pick(w.antonyms);
    const pool = [...w.synonyms, ...others.map((o) => o.word)].filter((c) => !isOpposite(c));
    distractors = pickDistractors(pool, answer, rand);
  } else if (type === "meaning") {
    answer = w.meaning;
    const pool = others.filter((o) => o.meaning && !isNear(o.word)).map((o) => o.meaning);
    distractors = pickDistractors(pool, answer, rand);
  } else if (type === "gap") {
    answer = w.word;
    // Opposites often fit the same sentence ("She was boastful about her prize"), so skip them too.
    const pool = others.filter((o) => isReady(o) && !isNear(o.word) && !isOpposite(o.word)).map((o) => o.word);
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
