// Builds <project>/index.html (HyperFrames composition) from <project>/data.json + <project>/reel.json.
// Usage: node build.js <project>
const fs = require("fs");
const path = require("path");
const { flagSvg, segments } = require("./lib");

const PROJ = path.resolve(process.argv[2] || ".");
const data = JSON.parse(fs.readFileSync(path.join(PROJ, "data.json"), "utf8"));
const reel = JSON.parse(fs.readFileSync(path.join(PROJ, "reel.json"), "utf8"));
const TOTAL = data.duration;
const PHRASES = reel.phrases;
const FLAG_SEGS = segments(reel.flags || [], TOTAL);
const music = { src: "assets/music.wav", volume: 0.13, ...(reel.music || {}) };

// ---------- sound effects ----------
const SFX_VOL = { pop: 0.35, swish: 0.3, whoosh: 0.45, riser: 0.35, ding: 0.35, yes: 0.45, sparkle: 0.4, impact: 0.6, chime: 0.4 };
const SFX_LEN = { pop: 0.16, swish: 0.28, whoosh: 0.6, riser: 0.5, ding: 0.9, yes: 0.9, sparkle: 0.95, impact: 0.7, chime: 1.1 };
const SFX_LEAD = 0.03; // sound lands a frame before the word

const lineAt = (p, l, j) => (l.at !== undefined ? l.at : p.s + j * 0.15);
let sfxHtml = "";
PHRASES.forEach((p, i) =>
  p.lines.forEach((l, j) => {
    if (!l.sfx) return;
    if (!SFX_VOL[l.sfx]) throw new Error(`phrase ${i} line ${j}: unknown sfx "${l.sfx}" (use ${Object.keys(SFX_VOL).join(", ")})`);
    const start = Math.max(0, lineAt(p, l, j) - SFX_LEAD);
    const dur = Math.min(SFX_LEN[l.sfx], TOTAL - start);
    sfxHtml += `
      <audio id="sfx-${i}-${j}" class="clip" src="assets/sfx/${l.sfx}.wav" data-start="${start.toFixed(3)}" data-duration="${dur.toFixed(2)}" data-volume="${SFX_VOL[l.sfx]}" data-track-index="${20 + ((i + j) % 2)}"></audio>`;
  }),
);

// ---------- caption markup ----------
const SIZE = { sm: 60, md: 86, bg: 128, xl: 178 };
const LINE_MAX = 920; // px, keeps every line inside the 1080 frame with margins
const QMARK = 240;
const XMARK = 120;

// Rough advance width per character (em) for DM Sans 800 / Hind Siliguri 700.
const charEm = (ch) => {
  const code = ch.codePointAt(0);
  if (code >= 0x0980 && code <= 0x09ff) return /[়-্ৗঁ-ঃ]/.test(ch) ? 0.18 : 0.6;
  if (ch === " ") return 0.26;
  if (/[A-Z]/.test(ch)) return 0.7;
  if (/[a-z]/.test(ch)) return 0.57;
  if (/[0-9]/.test(ch)) return 0.62;
  return 0.35;
};
const spanSize = (cls) => SIZE[cls.split(" ").find((c) => SIZE[c])] || SIZE.md;
const spanWidth = ([text, cls]) => {
  const c = cls.split(" ");
  if (c.includes("q")) return QMARK * 0.6 + 10;
  if (c.includes("x")) return XMARK + 22;
  const px = [...text].reduce((w, ch) => w + charEm(ch), 0) * spanSize(cls);
  return px + (c.some((k) => k.startsWith("pill")) ? 78 : 0);
};
// Shrink a line only when it would overflow LINE_MAX.
const lineFit = (spans) => Math.min(1, LINE_MAX / spans.reduce((w, s) => w + spanWidth(s), 0));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const spanHtml = ([t, cls], fit) => {
  const c = cls.split(" ");
  if (c.includes("q")) return `<span class="qmark" style="font-size:${Math.round(QMARK * fit)}px">?</span>`;
  if (c.includes("x"))
    return `<span class="xmark" style="width:${Math.round(XMARK * fit)}px;height:${Math.round(XMARK * fit)}px"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M33,33 L67,67 M67,33 L33,67"/></svg></span>`;
  const bar = c.includes("ul") ? `<i class="bar"></i>` : "";
  return `<span class="${cls}" style="font-size:${Math.round(spanSize(cls) * fit)}px">${esc(t)}${bar}</span>`;
};

let phrasesHtml = "";
PHRASES.forEach((p, i) => {
  const lines = p.lines
    .map((l, j) => {
      const fit = lineFit(l.spans);
      return `<div class="line" id="ph${i}-l${j}">${l.spans.map((s) => spanHtml(s, fit)).join("")}</div>`;
    })
    .join("\n        ");
  phrasesHtml += `
      <div id="ph${i}" class="clip phrase" data-start="${p.s}" data-duration="${(p.e - p.s).toFixed(2)}" data-track-index="${10 + (i % 3)}" data-layout-allow-overlap>
        <div class="inner" id="ph${i}-in">
        ${lines}
        </div>
      </div>`;
});

let flagsHtml = "";
FLAG_SEGS.forEach((g) => {
  g.flags.forEach((f, k) => {
    const fid = `flag-${g.id}-${k}`;
    flagsHtml += `
        <div id="${fid}" class="clip flagbg" data-start="${f.s}" data-duration="${(f.e - f.s).toFixed(2)}" data-track-index="2" data-layout-ignore>
          <div class="flagmove" id="${fid}-mv">${flagSvg(f.code)}<div class="silk" id="${fid}-silk"></div></div>
        </div>`;
  });
  flagsHtml += `
        <video id="${g.id}" class="clip fg" src="assets/${g.id}.webm" data-start="${g.start}" data-duration="${g.dur}" data-track-index="3" muted playsinline></video>`;
});

// ---------- timeline ----------
let js = "";
const t = (n) => +n.toFixed(3);
// punch-ins: alternate 1.0 / 1.08, quick snap then slow push
const punches = data.punches.filter((p) => p < TOTAL);
const bounds = [0, ...punches, TOTAL];
js += `tl.set("#cam", { scale: 1, transformOrigin: "50% 30%" }, 0);\n`;
for (let i = 0; i < bounds.length - 1; i++) {
  const s = bounds[i], e = bounds[i + 1];
  const lvl = i % 2 === 0 ? 1 : 1.08;
  if (i > 0) js += `tl.to("#cam", { scale: ${lvl}, duration: 0.12, ease: "power3.out" }, ${t(s)});\n`;
  js += `tl.to("#cam", { scale: ${lvl + 0.02}, duration: ${t(e - s - (i > 0 ? 0.12 : 0))}, ease: "sine.inOut" }, ${t(s + (i > 0 ? 0.12 : 0))});\n`;
}

// flags: fade/rise in, silky shading drift, gentle sway
FLAG_SEGS.forEach((g) =>
  g.flags.forEach((f, k) => {
    const fid = `flag-${g.id}-${k}`;
    const d = f.e - f.s;
    js += `tl.fromTo("#${fid}-mv", { opacity: 0, scale: 1.12, x: 0, rotation: -1.5 }, { opacity: 1, scale: 1.04, duration: 0.3, ease: "power2.out" }, ${t(f.s)});\n`;
    js += `tl.fromTo("#${fid}-mv", { x: 0, rotation: -1.5 }, { x: -40, rotation: 1.5, duration: ${t(d)}, ease: "sine.inOut" }, ${t(f.s)});\n`;
    js += `tl.fromTo("#${fid}-silk", { x: 0 }, { x: -720, duration: ${t(d)}, ease: "none" }, ${t(f.s)});\n`;
    js += `tl.to("#${fid}-mv", { opacity: 0, duration: 0.18, ease: "power2.in" }, ${t(f.e - 0.2)});\n`;
  }),
);

// phrases: lines pop in on their word, block exits fast
PHRASES.forEach((p, i) => {
  p.lines.forEach((l, j) => {
    const at = lineAt(p, l, j);
    js += `tl.fromTo("#ph${i}-l${j}", { opacity: 0, y: 46, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "back.out(2.4)" }, ${t(at)});\n`;
    if (l.spans.some(([, c]) => c.split(" ").includes("ul")))
      js += `tl.fromTo("#ph${i}-l${j} .bar", { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power3.out" }, ${t(at + 0.2)});\n`;
    if (l.spans.some(([, c]) => c === "q"))
      js += `tl.fromTo("#ph${i}-l${j} .qmark", { rotation: -25, scale: 0.3 }, { rotation: 8, scale: 1, duration: 0.45, ease: "back.out(3)" }, ${t(at + 0.05)});\n`;
  });
  js += `tl.to("#ph${i}-in", { opacity: 0, y: -24, duration: 0.15, ease: "power2.in" }, ${t(p.e - 0.17)});\n`;
});

const html = `<!doctype html>
<html lang="bn" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "DM Sans"; src: url("assets/fonts/dm-sans-latin-400-normal.woff2") format("woff2"); font-weight: 400; }
      @font-face { font-family: "DM Sans"; src: url("assets/fonts/dm-sans-latin-500-normal.woff2") format("woff2"); font-weight: 500; }
      @font-face { font-family: "DM Sans"; src: url("assets/fonts/dm-sans-latin-800-normal.woff2") format("woff2"); font-weight: 800; }
      @font-face { font-family: "Hind Siliguri"; src: url("assets/fonts/hind-siliguri-bengali-500-normal.woff2") format("woff2"); font-weight: 500; unicode-range: U+0951-0952, U+0964-0965, U+0980-09FE, U+200C-200D, U+25CC; }
      @font-face { font-family: "Hind Siliguri"; src: url("assets/fonts/hind-siliguri-bengali-700-normal.woff2") format("woff2"); font-weight: 700 800; unicode-range: U+0951-0952, U+0964-0965, U+0980-09FE, U+200C-200D, U+25CC; }
      :root {
        /* StudyIn brand palette */
        --navy: #020f30;
        --pine: #163033;
        --cobalt: #2017ce;
        --cherry: #f7003b;
        --ice: #00daff;
        --mint: #a6f970;
        --white: #ffffff;
        --blossom: #f7a5f9;
        --font: "DM Sans", "Hind Siliguri", sans-serif;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: var(--navy); }
      #root { position: relative; width: 100%; height: 100%; font-family: var(--font); overflow: hidden; }

      #cam { position: absolute; inset: 0; z-index: 1; }
      #main, .fg { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }
      #main { z-index: 1; }
      .flagbg { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 2; overflow: hidden;
        -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 42%, transparent 66%); mask-image: linear-gradient(180deg, #000 0%, #000 42%, transparent 66%); }
      .flagmove { position: absolute; left: -90px; top: -60px; width: 1260px; height: 1320px; }
      .flag-svg { width: 100%; height: 100%; display: block; }
      .silk { position: absolute; left: 0; top: 0; width: 2400px; height: 100%; mix-blend-mode: soft-light; opacity: 0.9;
        background: repeating-linear-gradient(100deg, rgba(0,0,0,.55) 0px, rgba(255,255,255,.55) 180px, rgba(0,0,0,.55) 360px); }
      .fg { z-index: 3; }

      #scrim { position: absolute; inset: 0; z-index: 4; pointer-events: none;
        background: linear-gradient(180deg, rgba(0,0,0,.18) 0%, transparent 14%, transparent 48%, rgba(0,0,0,.35) 70%, rgba(0,0,0,.72) 100%); }

      .phrase { position: absolute; left: 60px; width: 960px; z-index: 8; display: flex; justify-content: center;
        /* every phrase sits low on the chest; block bottom at y=1470 (inside the Instagram safe zone) */
        top: 1010px; height: 460px; align-items: flex-end; }
      .inner { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
      .line { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; column-gap: 0; line-height: 1.08;
        text-shadow: 0 6px 22px rgba(0,0,0,.55), 0 3px 0 rgba(2,15,48,.85); white-space: pre; }
      .line span { position: relative; display: inline-block; }
      .sm { font-weight: 700; }
      .md { font-weight: 800; }
      .bg { font-weight: 800; letter-spacing: -0.02em; }
      .xl { font-weight: 800; letter-spacing: -0.03em; }
      .track { letter-spacing: 0.14em; }
      /* p = Blossom, g = Mint, c = Ice, r = Cherry */
      .w { color: var(--white); } .r { color: var(--cherry); } .p { color: var(--blossom); } .g { color: var(--mint); } .c { color: var(--ice); }
      .pill-c, .pill-r, .pill-g { border-radius: 26px; padding: 0 30px; margin-left: 18px; text-shadow: none; box-shadow: 0 12px 30px rgba(2,15,48,.45); }
      .line > span:first-child { margin-left: 0; }
      .pill-c { background: var(--cobalt); color: var(--white); }
      .pill-r { background: var(--cherry); color: var(--white); }
      .pill-g { background: var(--mint); color: var(--navy); }
      .bar { position: absolute; left: 4%; right: 4%; bottom: 2px; height: 9px; border-radius: 6px; background: var(--cherry); transform-origin: 0% 50%; }
      .qmark { font-weight: 800; line-height: 0.8; margin-left: 10px; color: var(--cherry);
        text-shadow: 0 10px 0 var(--navy), 0 18px 30px rgba(2,15,48,.5); }
      .xmark { margin-left: 22px; }
      .xmark svg { width: 100%; height: 100%; }
      .xmark circle { fill: var(--cherry); }
      .xmark path { stroke: #fff; stroke-width: 11; stroke-linecap: round; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <div id="cam">
        <video id="main" class="clip" src="assets/cut.mp4" data-start="0" data-duration="${TOTAL}" data-track-index="1" data-has-audio="true" playsinline></video>
        ${flagsHtml}
      </div>
      <div id="scrim"></div>
      ${phrasesHtml}
      ${sfxHtml}
      <audio id="music" class="clip" src="${music.src}" data-start="0" data-duration="${TOTAL}" data-volume="${music.volume}" data-fade-in="0.5" data-fade-out="2" data-track-index="0"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${js}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

fs.writeFileSync(path.join(PROJ, "index.html"), html);
console.log(`wrote index.html (${TOTAL}s, ${PHRASES.length} phrases, ${FLAG_SEGS.length} flag segments, ${punches.length} punches)`);
