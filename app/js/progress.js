// Her progress, kept on the iPad and saved after every answer.

const PASS_STREAK = 2;

const fresh = () => ({ status: "New", timesAsked: 0, timesWrong: 0, correctInARow: 0, lastSeen: null });

export class ProgressStore {
  constructor(storage = globalThis.localStorage, key = "hoot.progress.v1") {
    this.storage = storage;
    this.key = key;
    this.words = {};
    this.jokesSeen = [];
    this.#load();
  }

  #load() {
    let raw = null;
    try { raw = this.storage?.getItem(this.key) ?? null; } catch { return; }
    if (raw === null) return;
    try {
      const data = JSON.parse(raw);
      this.words = data && typeof data.words === "object" && data.words ? data.words : {};
      this.jokesSeen = Array.isArray(data?.jokesSeen) ? data.jokesSeen : [];
    } catch {
      try { this.storage.setItem("hoot.progress.bad", raw); } catch { /* nothing more we can do */ }
    }
  }

  #save() {
    try {
      this.storage?.setItem(this.key, JSON.stringify({ words: this.words, jokesSeen: this.jokesSeen }));
    } catch { /* storage full or blocked: keep going in memory */ }
  }

  get(word) {
    return { ...fresh(), ...this.words[word.toLowerCase()] };
  }

  record(word, correct, today) {
    const p = this.get(word);
    p.timesAsked += 1;
    p.lastSeen = today;
    if (correct) {
      p.correctInARow += 1;
      if (p.status === "New" || p.correctInARow >= PASS_STREAK) p.status = "Passed";
    } else {
      p.timesWrong += 1;
      p.correctInARow = 0;
      p.status = "Practise";
    }
    this.words[word.toLowerCase()] = p;
    this.#save();
    return { ...p };
  }

  markJokeSeen(i) {
    this.jokesSeen.push(i);
    this.#save();
  }

  resetJokes() {
    this.jokesSeen = [];
    this.#save();
  }

  exportFile(today) {
    return { app: "hoot-word-quiz", exported: today, words: this.words, jokesSeen: this.jokesSeen };
  }
}
