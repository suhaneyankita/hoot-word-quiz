// Little sounds made with Web Audio, so there are no files to download.

let ctx = null;

export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch { ctx = null; }
}

function tone(type, from, to, start, length, volume = 0.25) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + length);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length);
}

export function playBoing() {
  if (!ctx) return;
  tone("sine", 400, 120, ctx.currentTime, 0.35, 0.35);
}

export function playCheer() {
  if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone("triangle", f, f, ctx.currentTime + i * 0.08, 0.16));
}
