// Saving her progress file to the GitHub repository, using a key kept only on this iPad.

export function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function call(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function saveToGitHub({ token, owner, repo, path, json, fetchImpl = globalThis.fetch, timeoutMs = 8000 }) {
  if (!token) return { ok: false, reason: "no-key" };
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const content = toBase64(JSON.stringify(json, null, 1));

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const current = await call(fetchImpl, `${url}?ref=main`, { headers, cache: "no-store" }, timeoutMs);
      if (current.status === 401 || current.status === 403) return { ok: false, reason: "bad-key" };
      const sha = current.ok ? (await current.json()).sha : undefined;

      const body = { message: "chore: save progress", content, branch: "main", ...(sha ? { sha } : {}) };
      const put = await call(fetchImpl, url, { method: "PUT", headers, body: JSON.stringify(body) }, timeoutMs);
      if (put.ok) return { ok: true };
      if (put.status === 401 || put.status === 403) return { ok: false, reason: "bad-key" };
      if (put.status !== 409 && put.status !== 422) return { ok: false, reason: `error-${put.status}` };
      // 409/422: the file changed since we looked; fetch the new sha and try once more.
    }
    return { ok: false, reason: "conflict" };
  } catch {
    return { ok: false, reason: "offline" };
  }
}
