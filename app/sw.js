// Keeps the whole app on the iPad so it works with no internet.
const CACHE = "hoot-v1";
const FILES = [
  "./", "index.html", "style.css", "manifest.webmanifest",
  "js/main.js", "js/wordlist.js", "js/progress.js", "js/selection.js",
  "js/questions.js", "js/jokes.js", "js/sounds.js",
  "data/words.json", "data/jokes.json",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  // New words: try the internet first, fall back to the saved copy.
  if (url.pathname.endsWith("/data/words.json")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("data/words.json", copy));
          }
          return res;
        })
        .catch(() => caches.match("data/words.json")),
    );
    return;
  }

  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request)));
});
