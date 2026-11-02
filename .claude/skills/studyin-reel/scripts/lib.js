// Shared helpers: inline SVG flags (2:1, viewBox 120x60) and flag-segment grouping.
const star = (cx, cy, R, r, n, rot = 0) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI * i) / n - Math.PI / 2 + rot;
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

const unionJack = (id, w) => `
<svg x="0" y="0" width="${w}" height="${w / 2}" viewBox="0 0 60 30">
  <clipPath id="${id}-s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
  <clipPath id="${id}-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
  <g clip-path="url(#${id}-s)">
    <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>
    <path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#${id}-t)" stroke="#C8102E" stroke-width="4"/>
    <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/>
    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/>
  </g>
</svg>`;

const hBands = (colors) => colors.map((c, i) => `<rect x="0" y="${(i * 60) / colors.length}" width="120" height="${60 / colors.length + 0.3}" fill="${c}"/>`).join("");
const vBands = (colors) => colors.map((c, i) => `<rect x="${(i * 120) / colors.length}" y="0" width="${120 / colors.length + 0.3}" height="60" fill="${c}"/>`).join("");
const nordic = (bg, cross, inner) =>
  `<rect width="120" height="60" fill="${bg}"/><rect x="33" width="15" height="60" fill="${cross}"/><rect y="22.5" width="120" height="15" fill="${cross}"/>` +
  (inner ? `<rect x="36.5" width="8" height="60" fill="${inner}"/><rect y="26" width="120" height="8" fill="${inner}"/>` : "");

const LEAF =
  "50,5 56,18 63,15 60,38 72,27 75,33 86,31 82,44 90,48 70,63 73,70 52,67 52,88 48,88 48,67 27,70 30,63 10,48 18,44 14,31 25,33 28,27 40,38 37,15 44,18";

// body: SVG content in a 120x60 box. view: the square-ish part kept in frame (canton flags keep the left).
const FLAGS = {
  uk: { view: "30 0 60 60", body: () => unionJack("uk", 120) },
  my: {
    view: "0 0 60 60",
    body: () => {
      const h = 60 / 14;
      let s = "";
      for (let i = 0; i < 14; i++) s += `<rect x="0" y="${(i * h).toFixed(3)}" width="120" height="${(h + 0.2).toFixed(3)}" fill="${i % 2 ? "#fff" : "#CC0001"}"/>`;
      return s + `<rect width="60" height="${(h * 8).toFixed(3)}" fill="#010066"/><circle cx="21" cy="${(h * 4).toFixed(3)}" r="12" fill="#FFCC00"/>` +
        `<circle cx="24.5" cy="${(h * 4).toFixed(3)}" r="10.2" fill="#010066"/><polygon points="${star(42, h * 4, 9, 3.8, 14)}" fill="#FFCC00"/>`;
    },
  },
  au: {
    view: "25 0 66 60",
    body: () => `<rect width="120" height="60" fill="#012169"/>${unionJack("au", 60)}` +
      [[30, 45, 9, 4, 7], [90, 50, 5, 2.2, 7], [76, 27, 5, 2.2, 7], [90, 11, 5, 2.2, 7], [103, 23, 5, 2.2, 7], [97, 32, 2.6, 1.1, 5]]
        .map((a) => `<polygon points="${star(...a)}" fill="#fff"/>`).join(""),
  },
  nz: {
    view: "25 0 66 60",
    body: () => `<rect width="120" height="60" fill="#012169"/>${unionJack("nz", 60)}` +
      [[90, 50], [78, 27], [103, 24], [90, 11]]
        .map(([x, y]) => `<polygon points="${star(x, y, 5.5, 2.3, 5)}" fill="#fff"/><polygon points="${star(x, y, 4, 1.7, 5)}" fill="#C8102E"/>`).join(""),
  },
  ca: {
    view: "30 0 60 60",
    body: () => `<rect width="120" height="60" fill="#fff"/><rect width="30" height="60" fill="#D52B1E"/><rect x="90" width="30" height="60" fill="#D52B1E"/>` +
      `<polygon points="${LEAF}" transform="translate(41.5,10) scale(0.37)" fill="#D52B1E"/>`,
  },
  us: {
    view: "0 0 60 60",
    body: () => {
      const h = 60 / 13;
      let s = "";
      for (let i = 0; i < 13; i++) s += `<rect y="${(i * h).toFixed(3)}" width="120" height="${(h + 0.2).toFixed(3)}" fill="${i % 2 ? "#fff" : "#B22234"}"/>`;
      s += `<rect width="48" height="${(h * 7).toFixed(3)}" fill="#3C3B6E"/>`;
      for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++)
        s += `<polygon points="${star(4 + c * 8 + (r % 2 ? 4 : 0), 2.5 + r * 3.35, 1.4, 0.55, 5)}" fill="#fff"/>`;
      return s;
    },
  },
  ie: { view: "30 0 60 60", body: () => vBands(["#169B62", "#fff", "#FF883E"]) },
  fr: { view: "30 0 60 60", body: () => vBands(["#0055A4", "#fff", "#EF4135"]) },
  it: { view: "30 0 60 60", body: () => vBands(["#009246", "#fff", "#CE2B37"]) },
  be: { view: "30 0 60 60", body: () => vBands(["#000", "#FDDA24", "#EF3340"]) },
  de: { view: "30 0 60 60", body: () => hBands(["#000", "#DD0000", "#FFCE00"]) },
  nl: { view: "30 0 60 60", body: () => hBands(["#AE1C28", "#fff", "#21468B"]) },
  hu: { view: "30 0 60 60", body: () => hBands(["#CE2939", "#fff", "#477050"]) },
  lt: { view: "30 0 60 60", body: () => hBands(["#FDB913", "#006A44", "#C1272D"]) },
  at: { view: "30 0 60 60", body: () => hBands(["#ED2939", "#fff", "#ED2939"]) },
  pl: { view: "30 0 60 60", body: () => hBands(["#fff", "#DC143C"]) },
  es: { view: "30 0 60 60", body: () => hBands(["#AA151B", "#F1BF00", "#F1BF00", "#AA151B"]) },
  jp: { view: "30 0 60 60", body: () => `<rect width="120" height="60" fill="#fff"/><circle cx="60" cy="30" r="18" fill="#BC002D"/>` },
  kr: {
    view: "30 0 60 60",
    body: () => `<rect width="120" height="60" fill="#fff"/>` +
      `<g transform="rotate(-33.7 60 30)"><path d="M45,30 a15,15 0 0 1 30,0 z" fill="#CD2E3A"/><path d="M45,30 a15,15 0 0 0 30,0 z" fill="#0047A0"/>` +
      `<circle cx="52.5" cy="30" r="7.5" fill="#CD2E3A"/><circle cx="67.5" cy="30" r="7.5" fill="#0047A0"/></g>` +
      [[30, 12, 1], [90, 48, 1], [30, 48, -1], [90, 12, -1]]
        .map(([x, y, d]) => `<g transform="rotate(${d * 56.3} ${x} ${y})">${[0, 4, 8].map((o) => `<rect x="${x - 8}" y="${y - 5 + o}" width="16" height="2.6" fill="#000"/>`).join("")}</g>`).join(""),
  },
  cn: {
    view: "0 0 60 60",
    body: () => `<rect width="120" height="60" fill="#DE2910"/><polygon points="${star(20, 15, 9, 3.6, 5)}" fill="#FFDE00"/>` +
      [[40, 6], [48, 12], [48, 21], [40, 27]].map(([x, y]) => `<polygon points="${star(x, y, 3, 1.2, 5)}" fill="#FFDE00"/>`).join(""),
  },
  ae: { view: "0 0 60 60", body: () => hBands(["#00732F", "#fff", "#000"]) + `<rect width="30" height="60" fill="#FF0000"/>` },
  se: { view: "15 0 60 60", body: () => nordic("#006AA7", "#FECC00") },
  fi: { view: "15 0 60 60", body: () => nordic("#fff", "#002F6C") },
  dk: { view: "15 0 60 60", body: () => nordic("#C8102E", "#fff") },
  no: { view: "15 0 60 60", body: () => nordic("#BA0C2F", "#fff", "#00205B") },
  ch: {
    view: "30 0 60 60",
    body: () => `<rect width="120" height="60" fill="#DA291C"/><rect x="55" y="12" width="10" height="36" fill="#fff"/><rect x="42" y="25" width="36" height="10" fill="#fff"/>`,
  },
  tr: {
    view: "15 0 60 60",
    body: () => `<rect width="120" height="60" fill="#E30A17"/><circle cx="42" cy="30" r="15" fill="#fff"/><circle cx="46" cy="30" r="12" fill="#E30A17"/>` +
      `<polygon points="${star(62, 30, 6, 2.4, 5, -Math.PI / 2)}" fill="#fff"/>`,
  },
  sg: {
    view: "0 0 60 60",
    body: () => hBands(["#EF3340", "#fff"]) + `<circle cx="20" cy="15" r="9" fill="#fff"/><circle cx="24" cy="15" r="8" fill="#EF3340"/>` +
      [[28, 9], [34, 13], [32, 20], [24, 20], [22, 13]].map(([x, y]) => `<polygon points="${star(x, y, 2, 0.8, 5)}" fill="#fff"/>`).join(""),
  },
};

const flagSvg = (code) => {
  const f = FLAGS[code];
  if (!f) throw new Error(`No flag for "${code}". Known: ${Object.keys(FLAGS).join(", ")}`);
  return `
<svg class="flag-svg" viewBox="${f.view}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <filter id="wave-${code}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035 0.06" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="5"/>
    </filter>
  </defs>
  <g filter="url(#wave-${code})">${f.body()}</g>
</svg>`;
};

// Flags whose windows touch share one cutout clip of the speaker.
const segments = (flags, duration) => {
  const sorted = [...flags].sort((a, b) => a.s - b.s);
  const segs = [];
  for (const f of sorted) {
    const last = segs[segs.length - 1];
    if (last && f.s - last.flags[last.flags.length - 1].e < 0.3) last.flags.push(f);
    else segs.push({ flags: [f] });
  }
  return segs.map((g, k) => {
    const start = Math.max(0, +(g.flags[0].s - 0.15).toFixed(2));
    const end = Math.min(duration, +(g.flags[g.flags.length - 1].e + 0.1).toFixed(2));
    return { id: `fg_${k}`, start, dur: +(end - start).toFixed(2), flags: g.flags };
  });
};

module.exports = { FLAGS, flagSvg, segments };
