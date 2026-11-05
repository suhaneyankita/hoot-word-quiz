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

test("mergeFrom takes words only the other device has", () => {
  const s = new ProgressStore(fakeStorage());
  s.record("timid", true, D);
  const changed = s.mergeFrom({ app: "hoot-word-quiz", words: { arduous: { status: "Practise", timesAsked: 2, timesWrong: 2, correctInARow: 0, lastSeen: D } }, jokesSeen: [4] });
  assert.equal(changed, true);
  assert.equal(s.get("arduous").status, "Practise");
  assert.equal(s.get("timid").status, "Passed");
  assert.deepEqual(s.jokesSeen, [4]);
});

test("mergeFrom keeps whichever record has more answers", () => {
  const s = new ProgressStore(fakeStorage());
  s.record("timid", false, "2026-11-04");
  s.record("timid", true, "2026-11-05");
  s.record("timid", true, "2026-11-05");
  const older = { app: "hoot-word-quiz", words: { timid: { status: "Practise", timesAsked: 1, timesWrong: 1, correctInARow: 0, lastSeen: "2026-11-04" } } };
  assert.equal(s.mergeFrom(older), false);
  assert.equal(s.get("timid").status, "Passed");
  const newer = { app: "hoot-word-quiz", words: { timid: { status: "Practise", timesAsked: 5, timesWrong: 3, correctInARow: 0, lastSeen: "2026-11-06" } } };
  assert.equal(s.mergeFrom(newer), true);
  assert.equal(s.get("timid").timesAsked, 5);
});

test("mergeFrom saves, and ignores files that aren't ours", () => {
  const st = fakeStorage();
  const s = new ProgressStore(st);
  assert.equal(s.mergeFrom({ app: "other", words: { x: { timesAsked: 9 } } }), false);
  assert.equal(s.mergeFrom(null), false);
  s.mergeFrom({ app: "hoot-word-quiz", words: { x: { status: "Passed", timesAsked: 1, timesWrong: 0, correctInARow: 1, lastSeen: D } } });
  assert.equal(new ProgressStore(st).get("x").status, "Passed");
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
