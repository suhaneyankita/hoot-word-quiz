import test from "node:test";
import assert from "node:assert/strict";
import { ProgressStore } from "../app/js/progress.js";
import { fakeStorage } from "./helpers.mjs";

const D = "2026-11-05";

test("new correct becomes Passed", () => {
  const s = new ProgressStore(fakeStorage());
  const p = s.record("Timid", true, D);
  assert.equal(p.status, "Passed");
  assert.equal(p.timesAsked, 1);
  assert.equal(p.lastSeen, D);
  assert.equal(s.get("timid").status, "Passed");
});

test("wrong becomes Practise", () => {
  const s = new ProgressStore(fakeStorage());
  s.record("timid", true, D);
  const p = s.record("timid", false, D);
  assert.deepEqual([p.status, p.timesWrong, p.correctInARow], ["Practise", 1, 0]);
});

test("Practise needs two in a row", () => {
  const s = new ProgressStore(fakeStorage());
  s.record("x", false, D);
  assert.equal(s.record("x", true, D).status, "Practise");
  assert.equal(s.record("x", true, D).status, "Passed");
});

test("unknown word gets default", () => {
  const s = new ProgressStore(fakeStorage());
  assert.deepEqual(s.get("nope"), { status: "New", timesAsked: 0, timesWrong: 0, correctInARow: 0, lastSeen: null });
});

test("saves after every record", () => {
  const st = fakeStorage();
  new ProgressStore(st).record("x", false, D);
  const again = new ProgressStore(st);
  assert.equal(again.get("x").status, "Practise");
  again.markJokeSeen(3);
  assert.deepEqual(new ProgressStore(st).jokesSeen, [3]);
});

test("corrupt storage is kept aside and ignored", () => {
  const st = fakeStorage({ "hoot.progress.v1": "{bad" });
  const s = new ProgressStore(st);
  assert.equal(s.get("x").status, "New");
  assert.equal(st.getItem("hoot.progress.bad"), "{bad");
});

test("setItem throwing keeps memory state", () => {
  const st = fakeStorage();
  st.setItem = () => { throw new Error("QuotaExceeded"); };
  const s = new ProgressStore(st);
  assert.equal(s.record("x", false, D).status, "Practise");
  assert.equal(s.get("x").timesWrong, 1);
});

test("resetJokes clears seen", () => {
  const s = new ProgressStore(fakeStorage());
  s.markJokeSeen(1); s.resetJokes();
  assert.deepEqual(s.jokesSeen, []);
});

test("exportFile shape", () => {
  const s = new ProgressStore(fakeStorage());
  s.record("timid", false, D);
  const f = s.exportFile(D);
  assert.equal(f.app, "hoot-word-quiz");
  assert.equal(f.exported, D);
  assert.equal(f.words.timid.timesWrong, 1);
  assert.deepEqual(f.jokesSeen, []);
});
