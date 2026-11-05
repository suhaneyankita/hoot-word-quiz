import test from "node:test";
import assert from "node:assert/strict";
import { pickWords, readyCount } from "../app/js/selection.js";
import { ProgressStore } from "../app/js/progress.js";
import { fakeStorage, mulberry32, synthetic, SAMPLE } from "./helpers.mjs";

const D = "2026-11-05";

function storeWithPractise(words, count) {
  const s = new ProgressStore(fakeStorage());
  words.slice(0, count).forEach((w) => s.record(w.word, false, D));
  return s;
}

const practiseIn = (picked, s) => picked.filter((w) => s.get(w.word).status === "Practise").length;
const distinct = (picked) => new Set(picked.map((w) => w.word)).size === picked.length;

test("half from practise", () => {
  const words = synthetic(30);
  const s = storeWithPractise(words, 8);
  const picked = pickWords(words, s, 10, mulberry32(1));
  assert.equal(picked.length, 10);
  assert.equal(practiseIn(picked, s), 5);
  assert.ok(distinct(picked));
});

test("tops up when practise is short", () => {
  const words = synthetic(30);
  const s = storeWithPractise(words, 2);
  const picked = pickWords(words, s, 10, mulberry32(2));
  assert.equal(picked.length, 10);
  assert.equal(practiseIn(picked, s), 2);
  assert.ok(distinct(picked));
});

test("tops up from practise when others are short", () => {
  const words = synthetic(12);
  const s = storeWithPractise(words, 10);
  const picked = pickWords(words, s, 10, mulberry32(3));
  assert.equal(picked.length, 10);
  assert.equal(practiseIn(picked, s), 8);
});

test("prefers most missed", () => {
  const words = synthetic(10);
  const s = new ProgressStore(fakeStorage());
  for (let i = 0; i < 5; i++) s.record("word0", false, D);
  s.record("word1", false, D);
  for (let i = 0; i < 3; i++) s.record("word2", false, D);
  const picked = pickWords(words, s, 2, mulberry32(4)).map((w) => w.word);
  assert.ok(picked.includes("word0"));
});

test("short quiz when few ready", () => {
  const words = synthetic(12);
  const picked = pickWords(words, new ProgressStore(fakeStorage()), 50, mulberry32(5));
  assert.equal(picked.length, 12);
  assert.ok(distinct(picked));
});

test("skips not ready", () => {
  const picked = pickWords(SAMPLE, new ProgressStore(fakeStorage()), 50, mulberry32(6)).map((w) => w.word);
  for (const bad of ["abhor", "wary"]) assert.ok(!picked.includes(bad));
  assert.equal(readyCount(SAMPLE), SAMPLE.length - 2);
});
