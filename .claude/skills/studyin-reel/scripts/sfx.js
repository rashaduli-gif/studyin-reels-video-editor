// Synthesizes the reel's sound-effect kit into <project>/assets/sfx/*.wav (mono, 44.1 kHz).
// Deterministic: noise uses a seeded PRNG. Usage: node sfx.js <project>
// No "wrong" buzz or question glide: the creator asked for those to be dropped.
const fs = require("fs");
const path = require("path");

const SR = 44100;
const OUT = path.join(path.resolve(process.argv[2] || "."), "assets", "sfx");
fs.mkdirSync(OUT, { recursive: true });

let seed = 1234567;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

const make = (seconds, fn) => {
  const n = Math.round(SR * seconds);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = fn(i / SR, i);
  return buf;
};

// one-pole lowpass with time-varying cutoff (Hz)
const lowpass = (src, cutoffAt) => {
  let y = 0;
  return src.map((x, i) => {
    const fc = cutoffAt(i / SR);
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    y += a * (x - y);
    return y;
  });
};
const highpass = (src, fc) => {
  const lp = lowpass(src, () => fc);
  return src.map((x, i) => x - lp[i]);
};
const bell = (t, f, decay) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t / decay);
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

const write = (name, data) => {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const g = peak ? 0.9 / peak : 1;
  const fade = Math.round(SR * 0.004);
  const b = Buffer.alloc(44 + data.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + data.length * 2, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => {
    const tail = Math.min(1, (data.length - 1 - i) / fade);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * g * tail)) * 32767), 44 + i * 2);
  });
  fs.writeFileSync(path.join(OUT, `${name}.wav`), b);
  console.log(`sfx/${name}.wav  ${(data.length / SR).toFixed(2)}s`);
};

// pop: quick pitch-drop blip for a highlighted word landing
write("pop", make(0.16, (t) => {
  const f = 300 + 700 * Math.exp(-t / 0.025);
  return Math.sin(2 * Math.PI * f * t) * env(t, 0.002, 0.05);
}));

// swish: short airy sweep for underlines and labels
write("swish", highpass(lowpass(make(0.28, (t) => rand() * Math.sin(Math.PI * Math.min(1, t / 0.28)) ** 2), (t) => 1500 + 9000 * (t / 0.28)), 600));

// whoosh: wide air pass for country names / flags
write("whoosh", lowpass(make(0.6, (t) => rand() * Math.sin(Math.PI * t / 0.6) ** 1.5), (t) => 300 + 4200 * Math.sin(Math.PI * t / 0.6)));

// riser: upward sweep for Pathway / Foundation
write("riser", make(0.5, (t) => {
  const p = t / 0.5;
  const f = 260 * Math.pow(5, p);
  return (0.7 * Math.sin(2 * Math.PI * f * t) + 0.25 * rand() * p) * Math.min(1, p * 1.4) * (p > 0.93 ? (1 - p) / 0.07 : 1);
}));

// ding: bright bell for numbers
write("ding", make(0.9, (t) => bell(t, 1568, 0.28) + 0.5 * bell(t, 3136, 0.14) + 0.25 * bell(t, 4704, 0.08)));

// yes: rising major arpeggio chime
write("yes", make(0.9, (t) =>
  [1047, 1319, 1568, 2093].reduce((s, f, k) => {
    const tt = t - k * 0.07;
    return tt < 0 ? s : s + bell(tt, f, 0.22) + 0.3 * bell(tt, f * 2, 0.1);
  }, 0)));

// sparkle: glittery high bells for FREE
const sparkleNotes = Array.from({ length: 14 }, (_, k) => ({ at: k * 0.035 + Math.abs(rand()) * 0.02, f: 2200 + Math.abs(rand()) * 3200 }));
write("sparkle", make(0.95, (t) =>
  sparkleNotes.reduce((s, n) => (t < n.at ? s : s + bell(t - n.at, n.f, 0.12)), 0)));

// impact: bass thump + click for the "না!" answer
write("impact", make(0.7, (t, i) => {
  const f = 45 + 95 * Math.exp(-t / 0.05);
  const click = i < SR * 0.008 ? rand() * (1 - i / (SR * 0.008)) : 0;
  return Math.sin(2 * Math.PI * f * t) * env(t, 0.003, 0.22) + 0.5 * click;
}));

// chime: two-note brand chime for "Bangladesh StudyIn"
write("chime", make(1.1, (t) => bell(t, 784, 0.35) + 0.4 * bell(t, 1568, 0.2) + (t > 0.12 ? bell(t - 0.12, 1175, 0.4) + 0.35 * bell(t - 0.12, 2350, 0.2) : 0)));
