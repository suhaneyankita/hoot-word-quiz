import test from "node:test";
import assert from "node:assert/strict";
import { PROMPTS, availableTypes, buildQuestion, buildQuiz, isUnsafe } from "../app/js/questions.js";
import { READY, SAMPLE, mulberry32 } from "./helpers.mjs";

const find = (name) => SAMPLE.find((x) => x.word === name);

test("prompts exact", () => {
  assert.deepEqual(PROMPTS, {
    synonym: "Pick the word that means the SAME as",
    antonym: "Find the word that means the OPPOSITE of",
    meaning: "What does this word MEAN?",
    gap: "Which word fits the gap?",
  });
});

test("availableTypes", () => {
  assert.ok(!availableTypes(find("annual")).includes("antonym"));
  assert.deepEqual(availableTypes(find("mandolin")).sort(), ["gap", "meaning"]);
  assert.deepEqual(availableTypes(find("timid")).sort(), ["antonym", "gap", "meaning", "synonym"]);
});

test("isUnsafe catches cross-referenced synonyms", () => {
  const g = find("gregarious");
  assert.equal(isUnsafe("sociable", g, SAMPLE), true);
  assert.equal(isUnsafe("Outgoing", g, SAMPLE), true);
  assert.equal(isUnsafe("summit", find("apex"), SAMPLE), true);
  assert.equal(isUnsafe("timid", g, SAMPLE), false);
});

test("sociable never a distractor for gregarious", () => {
  const rand = mulberry32(7);
  for (let i = 0; i < 300; i++) {
    for (const type of ["synonym", "gap"]) {
      const q = buildQuestion(find("gregarious"), type, READY, rand);
      for (const opt of q.options) {
        if (opt !== q.answer) assert.notEqual(opt.toLowerCase(), "sociable", `${type}: ${q.options}`);
      }
    }
  }
});

test("four unique options with answer", () => {
  const rand = mulberry32(8);
  for (const w of READY) {
    for (const type of availableTypes(w)) {
      const q = buildQuestion(w, type, READY, rand);
      assert.ok(q, `${w.word}/${type} returned null`);
      assert.equal(new Set(q.options.map((o) => o.toLowerCase())).size, 4, `${w.word}/${type}: ${q.options}`);
      assert.ok(q.options.includes(q.answer));
      assert.equal(q.prompt, PROMPTS[type]);
    }
  }
});

test("antonym distractors are never its other antonyms", () => {
  const rand = mulberry32(9);
  for (let i = 0; i < 100; i++) {
    const q = buildQuestion(find("timid"), "antonym", READY, rand);
    const others = q.options.filter((o) => o !== q.answer);
    assert.ok(!others.some((o) => ["bold", "brave"].includes(o)), String(q.options));
  }
});

test("a word whose synonyms are this word's antonyms is never an opposite distractor", () => {
  const rand = mulberry32(12);
  for (let i = 0; i < 200; i++) {
    const q = buildQuestion(find("gregarious"), "antonym", READY, rand);
    assert.ok(!q.options.filter((o) => o !== q.answer).includes("timid"), String(q.options));
  }
});

test("words sharing a synonym, and synonyms of synonyms, are never same-meaning distractors", () => {
  const words = [
    ...READY,
    { word: "bashful", meaning: "shy", synonyms: ["shy", "coy"], antonyms: [], sentence: "A bashful smile." },
    { word: "fearful", meaning: "scared", synonyms: ["scared", "afraid"], antonyms: [], sentence: "A fearful cat." },
  ];
  const timid = words.find((w) => w.word === "timid");
  assert.equal(isUnsafe("bashful", timid, words), true);
  const rand = mulberry32(13);
  for (let i = 0; i < 200; i++) {
    const q = buildQuestion(timid, "synonym", words, rand);
    const others = q.options.filter((o) => o !== q.answer);
    for (const bad of ["bashful", "scared", "afraid", "coy"]) assert.ok(!others.includes(bad), String(q.options));
  }
});

test("gap question shows blanked sentence and explanation", () => {
  const q = buildQuestion(find("timid"), "gap", READY, mulberry32(10));
  assert.equal(q.display, "The ______ mouse hid behind the cupboard.");
  assert.equal(q.answer, "timid");
  assert.equal(q.explanation, "Timid means shy and easily frightened.");
  const m = buildQuestion(find("timid"), "meaning", READY, mulberry32(10));
  assert.equal(m.display, "timid");
  assert.equal(m.explanation, 'Timid means shy and easily frightened. "The timid mouse hid behind the cupboard."');
});

test("too few safe distractors gives null", () => {
  const tiny = [find("gregarious"), find("sociable")];
  assert.equal(buildQuestion(find("gregarious"), "gap", tiny, mulberry32(1)), null);
});

test("type mix", () => {
  const full = READY.filter((w) => w.synonyms.length && w.antonyms.length).slice(0, 10);
  const quiz = buildQuiz(full, READY, mulberry32(11));
  assert.equal(quiz.length, 10);
  const counts = {};
  for (const q of quiz) counts[q.type] = (counts[q.type] ?? 0) + 1;
  for (const c of Object.values(counts)) assert.ok(c <= 5, JSON.stringify(counts));
});
