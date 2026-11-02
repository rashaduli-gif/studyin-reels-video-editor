// Cuts the speaker out for every flag segment in reel.json (HyperFrames remove-background).
// Skips segments whose cutout already matches. Usage: node cutouts.js <project>
const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");
const { segments } = require("./lib");

const PROJ = path.resolve(process.argv[2] || ".");
const data = JSON.parse(fs.readFileSync(path.join(PROJ, "data.json"), "utf8"));
const reel = JSON.parse(fs.readFileSync(path.join(PROJ, "reel.json"), "utf8"));
const assets = path.join(PROJ, "assets");

for (const seg of segments(reel.flags || [], data.duration)) {
  const out = path.join(assets, `${seg.id}.webm`);
  const meta = path.join(assets, `${seg.id}.json`);
  const want = JSON.stringify({ start: seg.start, dur: seg.dur });
  if (fs.existsSync(out) && fs.existsSync(meta) && fs.readFileSync(meta, "utf8") === want) {
    console.log(`${seg.id}: up to date`);
    continue;
  }
  const clip = path.join(assets, `${seg.id}_src.mp4`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(seg.start), "-i", path.join(assets, "cut.mp4"), "-t", String(seg.dur),
    "-an", "-c:v", "libx264", "-crf", "14", "-preset", "fast", clip], { stdio: "inherit" });
  console.log(`${seg.id}: removing background (${seg.dur}s, ${seg.flags.map((f) => f.code).join("+")})`);
  execSync(`npx hyperframes remove-background "assets/${seg.id}_src.mp4" -o "assets/${seg.id}.webm" --quality best`, { cwd: PROJ, stdio: "inherit" });
  fs.writeFileSync(meta, want);
  fs.unlinkSync(clip);
}
console.log("cutouts done");
