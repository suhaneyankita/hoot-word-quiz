// Word list: parsing the published words.json, readiness, and merging updates.

const text = (v) => (typeof v === "string" ? v.trim() : "");
const list = (v) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

export function parseWordList(json) {
  if (!json || typeof json !== "object" || typeof json.version !== "string" || !Array.isArray(json.words)) {
    return null;
  }
  const words = [];
  for (const raw of json.words) {
    if (!raw || typeof raw !== "object") continue;
    const word = text(raw.word).toLowerCase();
    if (!word) continue;
    words.push({
      word,
      meaning: text(raw.meaning),
      synonyms: list(raw.synonyms),
      antonyms: list(raw.antonyms),
      sentence: text(raw.sentence),
    });
  }
  return { version: json.version, words };
}

function wordPattern(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
}

export function wordInSentence(word, sentence) {
  return Boolean(word && sentence) && wordPattern(word).test(sentence);
}

export function blankSentence(w) {
  if (!wordInSentence(w.word, w.sentence)) return null;
  return w.sentence.replace(wordPattern(w.word), "______");
}

export function isReady(w) {
  return Boolean(w.meaning) && blankSentence(w) !== null;
}

export function mergeWordList(current, incoming) {
  if (current && !(incoming.version > current.version)) {
    return { version: current.version, words: current.words, changed: false, added: [] };
  }
  const before = new Set((current?.words ?? []).map((x) => x.word));
  const added = current ? incoming.words.map((x) => x.word).filter((x) => !before.has(x)) : [];
  return { version: incoming.version, words: incoming.words, changed: true, added };
}
