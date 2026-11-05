import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseWordList, isReady } from "../app/js/wordlist.js";
import { availableTypes, buildQuestion } from "../app/js/questions.js";
import { mulberry32 } from "./helpers.mjs";

const { words } = parseWordList(JSON.parse(readFileSync(new URL("../app/data/words.json", import.meta.url))));

test("every published word is ready and every type builds", () => {
  const rand = mulberry32(42);
  const failures = [];
  for (const w of words) {
    if (!isReady(w)) { failures.push(`${w.word}: not ready`); continue; }
    for (const t of availableTypes(w)) if (!buildQuestion(w, t, words, rand)) failures.push(`${w.word}/${t}`);
  }
  assert.deepEqual(failures, []);
});
