// Shared fixtures for the logic tests.

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const w = (word, meaning, synonyms, antonyms, sentence) => ({ word, meaning, synonyms, antonyms, sentence });

export const SAMPLE = [
  w("gregarious", "loving to be with other people", ["sociable", "outgoing", "friendly"], ["shy", "solitary"], "Max was so gregarious that he made lots of friends."),
  w("sociable", "friendly and enjoying company", ["friendly", "outgoing", "gregarious"], ["unsociable", "aloof"], "Leo is very sociable and loves parties."),
  w("timid", "shy and easily frightened", ["shy", "nervous", "fearful"], ["bold", "brave"], "The timid mouse hid behind the cupboard."),
  w("arduous", "very hard and tiring", ["difficult", "tough", "exhausting"], ["easy", "effortless"], "Climbing the mountain was an arduous task."),
  w("annual", "happening once every year", ["yearly"], [], "The school holds its annual sports day in June."),
  w("mandolin", "a small stringed instrument", [], [], "She played a tune on her mandolin."),
  w("abhor", "to hate strongly", ["hate", "detest"], ["love"], "She abhorred mess."),
  w("rant", "to speak angrily for a long time", ["rave", "rage"], [], "They grant a rant."),
  w("benign", "kind and gentle", ["kind", "gentle", "harmless"], ["harmful", "cruel"], "The old dog had a benign face."),
  w("candid", "honest and open", ["honest", "frank", "open"], ["dishonest", "secretive"], "I had a candid chat with my mum."),
  w("hinder", "to make something harder or slower", ["obstruct", "hamper", "block"], ["help", "assist"], "The rain will hinder the builders."),
  w("nimble", "quick and light in movement", ["agile", "quick", "sprightly"], ["clumsy", "slow"], "The nimble squirrel leapt between branches."),
  w("gaunt", "very thin and bony", ["bony", "skinny", "haggard"], ["plump", "chubby"], "The castaway looked gaunt."),
  w("summit", "the top of a mountain", ["peak", "top", "apex"], ["base", "bottom"], "The summit of Everest is freezing."),
  w("apex", "the very top point", ["peak", "summit", "pinnacle"], ["bottom", "base"], "They reached the apex of the hill."),
  w("wary", "", [], [], ""),
];

export const READY = SAMPLE.filter((x) => !["abhor", "wary"].includes(x.word));

export function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    map: m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

export function synthetic(n) {
  return Array.from({ length: n }, (_, i) =>
    w(`word${i}`, `meaning number ${i}`, [`syn${i}a`, `syn${i}b`], [`ant${i}`], `This is word${i} in a sentence.`));
}
