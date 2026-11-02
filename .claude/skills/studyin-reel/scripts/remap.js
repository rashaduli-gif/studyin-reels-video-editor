// Converts a reel.json written against SRT/source times (e.g. a beat plan made in the claude.ai
// Project) onto the cut timeline using data.json's kept ranges. Writes <project>/reel.json.
// Usage: node remap.js <project> <plan.json>
const fs = require("fs");
const path = require("path");

const PROJ = path.resolve(process.argv[2] || ".");
const plan = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const { keep, duration } = JSON.parse(fs.readFileSync(path.join(PROJ, "data.json"), "utf8"));

// Source second -> cut second. Times inside a removed gap snap to the next kept moment.
const remap = (t) => {
  let acc = 0;
  for (const [a, b] of keep) {
    if (t < a) return +acc.toFixed(3);
    if (t <= b) return +(acc + t - a).toFixed(3);
    acc += b - a;
  }
  return +Math.min(acc, duration).toFixed(3);
};

const out = {
  ...plan,
  phrases: plan.phrases.map((p) => ({
    ...p,
    s: remap(p.s),
    e: remap(p.e),
    lines: p.lines.map((l) => (l.at === undefined ? l : { ...l, at: remap(l.at) })),
  })),
  flags: (plan.flags || []).map((f) => ({ ...f, s: remap(f.s), e: remap(f.e) })),
};
fs.writeFileSync(path.join(PROJ, "reel.json"), JSON.stringify(out, null, 1));
console.log(`wrote reel.json: ${out.phrases.length} phrases, ${out.flags.length} flags remapped to the cut timeline`);
