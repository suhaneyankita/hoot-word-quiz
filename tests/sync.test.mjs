import test from "node:test";
import assert from "node:assert/strict";
import { saveToGitHub, toBase64 } from "../app/js/sync.js";

const base = { token: "t", owner: "o", repo: "r", path: "progress/progress.json" };

// A tiny stand-in for the GitHub contents API.
function fakeGitHub({ existingSha = null, putStatus = [200], getStatus = null } = {}) {
  const calls = [];
  const puts = [...putStatus];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method ?? "GET", headers: opts.headers, body: opts.body ? JSON.parse(opts.body) : null });
    if ((opts.method ?? "GET") === "GET") {
      const status = getStatus ?? (existingSha ? 200 : 404);
      return { ok: status === 200, status, json: async () => ({ sha: existingSha }) };
    }
    const status = puts.shift() ?? 200;
    return { ok: status < 300, status, json: async () => ({ content: { sha: "new" } }) };
  };
  return { calls, fetchImpl };
}

test("toBase64 handles plain and non-ASCII text", () => {
  assert.equal(toBase64("hello"), "aGVsbG8=");
  assert.equal(Buffer.from(toBase64("é🦉"), "base64").toString("utf8"), "é🦉");
});

test("creates the file when it does not exist yet", async () => {
  const gh = fakeGitHub();
  const res = await saveToGitHub({ ...base, json: { a: 1 }, fetchImpl: gh.fetchImpl });
  assert.deepEqual(res, { ok: true });
  const put = gh.calls.find((c) => c.method === "PUT");
  assert.equal(put.url, "https://api.github.com/repos/o/r/contents/progress/progress.json");
  assert.equal(put.headers.Authorization, "Bearer t");
  assert.equal(put.body.sha, undefined);
  assert.deepEqual(JSON.parse(Buffer.from(put.body.content, "base64").toString()), { a: 1 });
});

test("updates the existing file using its sha", async () => {
  const gh = fakeGitHub({ existingSha: "abc" });
  assert.deepEqual(await saveToGitHub({ ...base, json: {}, fetchImpl: gh.fetchImpl }), { ok: true });
  assert.equal(gh.calls.find((c) => c.method === "PUT").body.sha, "abc");
});

test("retries once when the file changed in between", async () => {
  const gh = fakeGitHub({ existingSha: "abc", putStatus: [409, 200] });
  assert.deepEqual(await saveToGitHub({ ...base, json: {}, fetchImpl: gh.fetchImpl }), { ok: true });
  assert.equal(gh.calls.filter((c) => c.method === "PUT").length, 2);
});

test("reports a bad or expired key", async () => {
  const gh = fakeGitHub({ getStatus: 401 });
  assert.deepEqual(await saveToGitHub({ ...base, json: {}, fetchImpl: gh.fetchImpl }), { ok: false, reason: "bad-key" });
});

test("reports offline without throwing", async () => {
  const fetchImpl = async () => { throw new TypeError("Failed to fetch"); };
  assert.deepEqual(await saveToGitHub({ ...base, json: {}, fetchImpl }), { ok: false, reason: "offline" });
});

test("does nothing without a key", async () => {
  assert.deepEqual(await saveToGitHub({ ...base, token: "", json: {}, fetchImpl: async () => { throw new Error("no"); } }), { ok: false, reason: "no-key" });
});
