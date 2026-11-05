import test from "node:test";
import assert from "node:assert/strict";
import { fetchJson } from "../app/js/net.js";

const ok = (body) => async () => ({ ok: true, json: async () => body });

test("returns parsed json", async () => {
  assert.deepEqual(await fetchJson("x", 1000, ok({ a: 1 })), { a: 1 });
});

test("returns null on a bad status, a throw, or bad json", async () => {
  assert.equal(await fetchJson("x", 1000, async () => ({ ok: false })), null);
  assert.equal(await fetchJson("x", 1000, async () => { throw new TypeError("offline"); }), null);
  assert.equal(await fetchJson("x", 1000, async () => ({ ok: true, json: async () => { throw new SyntaxError("bad"); } })), null);
});

test("gives up on a stalled connection", async () => {
  const stalled = (_url, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
  const started = Date.now();
  assert.equal(await fetchJson("x", 50, stalled), null);
  assert.ok(Date.now() - started < 1000);
});
