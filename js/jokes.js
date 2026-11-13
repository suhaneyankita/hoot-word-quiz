// A joke or fun fact she hasn't seen yet, for the end of each quiz.

export function nextJoke(jokes, store, rand = Math.random) {
  let unseen = jokes.map((_, i) => i).filter((i) => !store.jokesSeen.includes(i));
  if (!unseen.length) {
    store.resetJokes();
    unseen = jokes.map((_, i) => i);
  }
  const i = unseen[Math.floor(rand() * unseen.length)];
  store.markJokeSeen(i);
  return jokes[i];
}
