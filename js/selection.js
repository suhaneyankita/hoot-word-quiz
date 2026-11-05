// Choosing which words go into a quiz: half to practise, half new or passed.
import { isReady } from "./wordlist.js";

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function readyCount(words) {
  return words.filter(isReady).length;
}

// Oldest first, never-seen before everything.
const byLastSeen = (store) => (a, b) => (store.get(a.word).lastSeen ?? "").localeCompare(store.get(b.word).lastSeen ?? "");

export function pickWords(words, store, n, rand = Math.random) {
  const ready = words.filter(isReady);
  const status = (w) => store.get(w.word).status;

  const practise = shuffle(ready.filter((w) => status(w) === "Practise"), rand)
    .sort(byLastSeen(store))
    .sort((a, b) => store.get(b.word).timesWrong - store.get(a.word).timesWrong);
  const others = [
    ...shuffle(ready.filter((w) => status(w) === "New"), rand),
    ...ready.filter((w) => status(w) === "Passed").sort(byLastSeen(store)),
  ];

  const total = Math.min(n, ready.length);
  let fromPractise = Math.min(Math.floor(total / 2), practise.length);
  fromPractise += Math.max(0, total - fromPractise - others.length);
  const chosen = [...practise.slice(0, fromPractise), ...others.slice(0, total - fromPractise)];
  return shuffle(chosen, rand);
}
