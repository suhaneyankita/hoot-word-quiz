import test from "node:test";
import assert from "node:assert/strict";
import { parseWordList, blankSentence, isReady, mergeWordList, wordInSentence } from "../app/js/wordlist.js";
import { SAMPLE } from "./helpers.mjs";

const find = (name) => SAMPLE.find((x) => x.word === name);

test("blank whole word only", () => {
  assert.equal(blankSentence(find("rant")), "They grant a ______.");
  assert.equal(blankSentence(find("abhor")), null);
  assert.equal(isReady(find("abhor")), false);
});

test("blank is case-insensitive and keeps the rest", () => {
  assert.equal(blankSentence({ word: "unforeseen", sentence: "Unforeseen delays happened." }), "______ delays happened.");
  assert.equal(wordInSentence("a.b", "axb here"), false);
});

test("isReady ignores missing antonyms and synonyms", () => {
  assert.equal(isReady(find("annual")), true);
  assert.equal(isReady(find("mandolin")), true);
  assert.equal(isReady(find("wary")), false);
});

test("parseWordList rejects malformed", () => {
  assert.equal(parseWordList({ nope: 1 }), null);
  assert.equal(parseWordList("x"), null);
  assert.equal(parseWordList(null), null);
  const ok = parseWordList({ version: "v1", words: [{ word: "Timid ", meaning: "shy" }, { meaning: "no word" }] });
  assert.deepEqual(ok.words, [{ word: "timid", meaning: "shy", synonyms: [], antonyms: [], sentence: "" }]);
});

test("merge keeps newer only", () => {
  const current = { version: "2026-11-05T10:00:00+00:00", words: [{ word: "a" }, { word: "b" }] };
  const older = { version: "2026-11-01T10:00:00+00:00", words: [{ word: "z" }] };
  assert.equal(mergeWordList(current, older).changed, false);
  assert.deepEqual(mergeWordList(current, older).words, current.words);
  const newer = { version: "2026-11-06T10:00:00+00:00", words: [{ word: "a" }, { word: "c" }] };
  const merged = mergeWordList(current, newer);
  assert.equal(merged.changed, true);
  assert.deepEqual(merged.words.map((x) => x.word), ["a", "c"]);
  assert.deepEqual(merged.added, ["c"]);
});

test("merge with nothing stored takes incoming", () => {
  const incoming = { version: "v", words: [{ word: "a" }] };
  assert.equal(mergeWordList(null, incoming).changed, true);
});
