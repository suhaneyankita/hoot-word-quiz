import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextJoke } from "../app/js/jokes.js";
import { ProgressStore } from "../app/js/progress.js";
import { fakeStorage, mulberry32 } from "./helpers.mjs";

test("at least 150 unique, short, well-formed", () => {
  const jokes = JSON.parse(readFileSync(new URL("../app/data/jokes.json", import.meta.url)));
  assert.ok(jokes.length >= 150, `only ${jokes.length}`);
  assert.equal(new Set(jokes.map((j) => j.text)).size, jokes.length);
  for (const j of jokes) {
    assert.ok(["joke", "fact"].includes(j.kind));
    assert.ok(j.text.length < 200, j.text);
  }
});

test("no repeat until exhausted", () => {
  const jokes = [{ kind: "joke", text: "a" }, { kind: "joke", text: "b" }, { kind: "fact", text: "c" }];
  const store = new ProgressStore(fakeStorage());
  const rand = mulberry32(1);
  const first = [1, 2, 3].map(() => nextJoke(jokes, store, rand).text);
  assert.deepEqual([...first].sort(), ["a", "b", "c"]);
  const fourth = nextJoke(jokes, store, rand);
  assert.ok(["a", "b", "c"].includes(fourth.text));
  assert.equal(store.jokesSeen.length, 1);
});

test("seen list survives reopening the app", () => {
  const jokes = [{ kind: "joke", text: "a" }, { kind: "joke", text: "b" }];
  const st = fakeStorage();
  const one = nextJoke(jokes, new ProgressStore(st), mulberry32(2)).text;
  const two = nextJoke(jokes, new ProgressStore(st), mulberry32(2)).text;
  assert.notEqual(one, two);
});
