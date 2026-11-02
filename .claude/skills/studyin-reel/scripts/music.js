// Composes the reel's background track into <project>/assets/music.wav (stereo, 44.1 kHz).
// Upbeat, hopeful study-abroad vibe: 100 BPM, C-G-Am-F, soft kick/clap/hats, bass,
// plucked arpeggio and a warm pad. Kept sparse in the mids so the voice stays clear.
// Deterministic (seeded noise). Usage: node music.js <project>   (length = data.json duration + 3 s)
const fs = require("fs");
const path = require("path");

const PROJ = path.resolve(process.argv[2] || ".");
const SR = 44100;
const BPM = 100;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const SECONDS = Math.ceil(JSON.parse(fs.readFileSync(path.join(PROJ, "data.json"), "utf8")).duration + 3);
const N = Math.round(SR * SECONDS);
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Progression (one chord per bar): C - G - Am - F
const CHORDS = [
  { root: 36, notes: [60, 64, 67, 72] },
  { root: 43, notes: [59, 62, 67, 71] },
  { root: 45, notes: [57, 60, 64, 69] },
  { root: 41, notes: [57, 60, 65, 69] },
];
const bars = Math.ceil(SECONDS / BAR);
const INTRO_BARS = 1; // pad + pluck only
const OUTRO_START = SECONDS - BAR * 1.5;

// add a mono event rendered by fn(t) for `dur` seconds at time `at`, panned (-1..1)
const add = (at, dur, pan, fn) => {
  const s0 = Math.round(at * SR);
  const n = Math.round(dur * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const v = fn(i / SR);
    L[s0 + i] += v * gl;
    R[s0 + i] += v * gr;
  }
};

// instruments
const kick = (t) => Math.sin(2 * Math.PI * (48 * t + (70 / 30) * (1 - Math.exp(-30 * t)))) * Math.exp(-t / 0.18) * 0.9;
const clap = () => {
  let lp = 0;
  return (t) => {
    const x = rand();
    lp += 0.35 * (x - lp);
    return (x - lp) * Math.exp(-t / 0.09) * 0.35;
  };
};
const hat = (amp) => {
  let lp = 0;
  return (t) => {
    const x = rand();
    lp += 0.6 * (x - lp);
    return (x - lp) * Math.exp(-t / 0.025) * amp;
  };
};
const bass = (f) => (t) => (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * Math.min(1, t / 0.01) * Math.exp(-t / 0.5) * 0.5;
const pluck = (f) => (t) =>
  (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t / 0.05)) * Math.min(1, t / 0.003) * Math.exp(-t / 0.16) * 0.16;
const pad = (f, dur) => (t) => {
  const a = Math.min(1, t / 0.4) * Math.min(1, (dur - t) / 0.4);
  let s = 0;
  for (const d of [0.996, 1.004]) for (let h = 1; h <= 4; h++) s += Math.sin(2 * Math.PI * f * d * h * t) / (h * h);
  return s * a * 0.035;
};

// arpeggio pattern over 16 sixteenths: indexes into chord notes (+12 for the top)
const ARP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 3, 0, 2, 1, 3];

for (let b = 0; b < bars; b++) {
  const t0 = b * BAR;
  if (t0 >= SECONDS) break;
  const ch = CHORDS[b % CHORDS.length];
  const drums = b >= INTRO_BARS && t0 < OUTRO_START;

  // pad: whole bar, chord tones
  ch.notes.slice(0, 3).forEach((n, k) => add(t0, BAR + 0.3, k === 1 ? -0.3 : 0.3, pad(midi(n), BAR + 0.3)));

  // pluck arpeggio in sixteenths, an octave up, alternating pan
  ARP.forEach((idx, s) => {
    const at = t0 + s * (BEAT / 4);
    add(at, 0.5, s % 2 ? 0.45 : -0.45, pluck(midi(ch.notes[idx] + 12)));
  });

  if (!drums) continue;
  // bass: beat 1 and the "and" of 2, beat 3 and 4
  [0, 1.5, 2, 3].forEach((bt) => add(t0 + bt * BEAT, 0.6, 0, bass(midi(ch.root + (bt === 3 ? 7 : 0)))));
  // kick on 1 and 3 (+ pickup on the last eighth of every 4th bar)
  [0, 2].forEach((bt) => add(t0 + bt * BEAT, 0.5, 0, kick));
  if (b % 4 === 3) add(t0 + 3.5 * BEAT, 0.5, 0, kick);
  // clap on 2 and 4
  [1, 3].forEach((bt) => add(t0 + bt * BEAT, 0.3, 0.1, clap()));
  // hats on eighths, offbeats a little louder
  for (let e = 0; e < 8; e++) add(t0 + e * (BEAT / 2), 0.08, 0.35, hat(e % 2 ? 0.12 : 0.07));
}

// master: gentle fade in/out, soft clip, normalize
const fadeIn = SR * 0.6;
const fadeOut = SR * 2.5;
let peak = 0;
for (let i = 0; i < N; i++) {
  const g = Math.min(1, i / fadeIn) * Math.min(1, (N - i) / fadeOut);
  L[i] = Math.tanh(L[i] * g * 1.2);
  R[i] = Math.tanh(R[i] * g * 1.2);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = 0.89 / peak;

const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(PROJ, "assets", "music.wav"), buf);
console.log(`wrote assets/music.wav (${SECONDS}s, ${BPM} BPM)`);
