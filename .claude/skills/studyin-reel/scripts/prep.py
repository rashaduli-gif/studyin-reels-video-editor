"""Silence/retake cut + word timeline for a StudyIn reel.

Writes <project>/data.json and <project>/words.txt, and (unless --no-encode)
encodes <project>/assets/cut.mp4 at 1080x1920/30fps with the voice at -16 LUFS.

Usage: python -I prep.py --video V --srt S --project P [--no-encode]
       [--silence-db -28] [--min-silence 0.3] [--keep-gap 0.12]
"""
import argparse
import json
import os
import re
import subprocess
import sys

PUNCH_MAX_GAP = 4.0
MIN_SEGMENT = 0.15

# SRT typos seen before; extend as new ones appear.
FIXES = {"Ausatralia": "Australia"}

# Spoken country name (English or Bangla, lowercase) -> flag code in lib.js
COUNTRIES = {
    "uk": "uk", "england": "uk", "britain": "uk", "united kingdom": "uk", "যুক্তরাজ্য": "uk", "ইংল্যান্ড": "uk",
    "malaysia": "my", "মালয়েশিয়া": "my", "মালয়েশিয়া": "my",
    "australia": "au", "অস্ট্রেলিয়া": "au", "অস্ট্রেলিয়া": "au",
    "new zealand": "nz", "নিউজিল্যান্ড": "nz",
    "canada": "ca", "কানাডা": "ca",
    "usa": "us", "america": "us", "united states": "us", "আমেরিকা": "us", "যুক্তরাষ্ট্র": "us",
    "ireland": "ie", "আয়ারল্যান্ড": "ie", "france": "fr", "ফ্রান্স": "fr", "italy": "it", "ইতালি": "it",
    "belgium": "be", "germany": "de", "জার্মানি": "de", "netherlands": "nl", "holland": "nl", "নেদারল্যান্ডস": "nl",
    "hungary": "hu", "হাঙ্গেরি": "hu", "lithuania": "lt", "austria": "at", "poland": "pl", "পোল্যান্ড": "pl",
    "spain": "es", "স্পেন": "es", "japan": "jp", "জাপান": "jp", "korea": "kr", "south korea": "kr", "কোরিয়া": "kr",
    "china": "cn", "চীন": "cn", "dubai": "ae", "uae": "ae", "দুবাই": "ae", "sweden": "se", "সুইডেন": "se",
    "finland": "fi", "ফিনল্যান্ড": "fi", "denmark": "dk", "ডেনমার্ক": "dk", "norway": "no", "নরওয়ে": "no",
    "switzerland": "ch", "turkey": "tr", "তুরস্ক": "tr", "singapore": "sg", "সিঙ্গাপুর": "sg",
}


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)


def probe_duration(video):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]).stdout
    return float(out.strip())


def detect_silences(video, db, min_d):
    res = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", video, "-vn", "-ac", "1", "-af", f"silencedetect=noise={db}dB:d={min_d}", "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", res.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", res.stderr)]
    return list(zip(starts, ends + [None] * (len(starts) - len(ends))))


def ts(s):
    h, m, rest = s.split(":")
    sec, ms = rest.replace(".", ",").split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000


def parse_srt(path):
    text = open(path, encoding="utf-8-sig").read().replace("\r\n", "\n")
    cues = []
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = block.strip().splitlines()
        idx = next((i for i, l in enumerate(lines) if "-->" in l), None)
        if idx is None:
            continue
        a, b = [x.strip() for x in lines[idx].split("-->")]
        body = " ".join(lines[idx + 1:])
        for k, v in FIXES.items():
            body = body.replace(k, v)
        if body.strip():
            cues.append({"start": ts(a), "end": ts(b), "text": body.strip()})
    return cues


def norm_tokens(text):
    return [t for t in re.sub(r"[^\wঀ-৿ ]", " ", text.lower()).split() if t]


def find_retakes(cues):
    """A cue whose opening words are repeated by one of the next 3 cues is an earlier take: drop it, keep the last."""
    drops = []
    for i, c in enumerate(cues):
        head = norm_tokens(c["text"])[:4]
        if len(head) < 3:
            continue
        for j in range(i + 1, min(i + 4, len(cues))):
            if norm_tokens(cues[j]["text"])[:4] == head:
                drops.append((c["start"], cues[j]["start"], c["text"]))
                break
    return drops


def subtract(ranges, cut):
    a, b = cut
    out = []
    for s, e in ranges:
        if e <= a or s >= b:
            out.append((s, e))
            continue
        if s < a:
            out.append((s, a))
        if e > b:
            out.append((b, e))
    return out


def keep_ranges(duration, silences, retakes, keep_gap, speech_span):
    """Speech = complement of the silences, each side padded so a removed pause leaves `keep_gap` of air.
    Leading and trailing silence are dropped the same way."""
    pad = keep_gap / 2
    speech, t = [], 0.0
    for s, e in silences:
        e = duration if e is None else e
        if s > t:
            speech.append((max(0.0, t - pad), min(duration, s + pad)))
        t = e
    if t < duration:
        speech.append((max(0.0, t - pad), duration))
    # Head/tail shorter than the detector's minimum: trim to the SRT's first/last cue.
    first, last = speech_span
    speech = subtract(speech, (0.0, max(0.0, first - 0.15)))
    speech = subtract(speech, (min(duration, last + 0.3), duration))
    for a, b, _ in retakes:
        speech = subtract(speech, (a, b))
    merged = []
    for s, e in sorted(speech):
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    return [(round(s, 3), round(e, 3)) for s, e in merged if e - s >= MIN_SEGMENT]


def remap(t, keep):
    acc = 0.0
    for a, b in keep:
        if t < a:
            return acc
        if t <= b:
            return acc + (t - a)
        acc += b - a
    return acc


def inside(t, keep):
    return any(a <= t <= b for a, b in keep)


def build_words(cues, keep, retakes):
    dropped = {(a, b) for a, b, _ in retakes}
    words = []
    for c in cues:
        if any(a <= c["start"] < b for a, b in dropped):
            continue
        toks = c["text"].split()
        ca, cb = remap(c["start"], keep), remap(c["end"], keep)
        weights = [len(w) + 2 for w in toks]
        total = sum(weights) or 1
        t = ca
        for w, wt in zip(toks, weights):
            d = (cb - ca) * wt / total
            words.append({"i": len(words), "start": round(t, 3), "end": round(t + d, 3), "text": w})
            t += d
    return words


def build_punches(keep, total):
    cuts, acc = [], 0.0
    for a, b in keep[:-1]:
        acc += b - a
        cuts.append(round(acc, 3))
    # Only cuts that are real jumps (>0.25 s apart) get a punch; then fill so no gap exceeds 4 s.
    pts = [0.0] + [c for c in cuts if c > 0.5 and c < total - 0.5] + [total]
    punches = []
    for x, y in zip(pts, pts[1:]):
        if x > 0 and (not punches or x - punches[-1] > 1.2):
            punches.append(round(x, 3))
        n = int((y - x) // PUNCH_MAX_GAP)
        for i in range(1, n + 1):
            punches.append(round(x + (y - x) * i / (n + 1), 3))
    return sorted(set(punches))


def find_countries(words):
    hits = []
    for w in words:
        bare = re.sub(r"(তে|এ|র|ের|-তে|-এ)$", "", re.sub(r"[।,?!.]+$", "", w["text"])).lower()
        code = COUNTRIES.get(bare) or COUNTRIES.get(w["text"].lower().strip("।,?!."))
        if not code:
            for name, c in COUNTRIES.items():
                if " " not in name and bare.startswith(name) and len(name) >= 2:
                    code = c
                    break
        if code:
            hits.append({"word": w["i"], "time": w["start"], "text": w["text"], "code": code})
    # two-word names (new zealand, south korea, united kingdom ...)
    for a, b in zip(words, words[1:]):
        pair = f"{a['text'].lower()} {re.sub(r'[।,?!.]+$', '', b['text'].lower())}"
        if pair in COUNTRIES:
            hits.append({"word": a["i"], "time": a["start"], "text": pair, "code": COUNTRIES[pair]})
    return sorted(hits, key=lambda h: h["time"])


def encode(video, keep, out_path, work):
    parts, labels = [], []
    for i, (a, b) in enumerate(keep):
        d = b - a
        parts.append(
            f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,"
            f"crop=1080:1920,setsar=1,fps=30[v{i}];"
            f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st={max(0, d - 0.015):.3f}:d=0.015[a{i}];"
        )
        labels.append(f"[v{i}][a{i}]")
    fc = "".join(parts) + "".join(labels) + f"concat=n={len(keep)}:v=1:a=1[v][ac];[ac]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]"
    with open(os.path.join(work, "cut_graph.txt"), "w", encoding="utf-8") as f:
        f.write(fc)  # kept for debugging; passed inline so ffmpeg 6 (Ubuntu) and 7+ both work
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", video, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "15", "-g", "15", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", out_path],
        check=True,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--srt", required=True)
    ap.add_argument("--project", required=True)
    ap.add_argument("--no-encode", action="store_true")
    ap.add_argument("--silence-db", type=float, default=-28)
    ap.add_argument("--min-silence", type=float, default=0.3)
    ap.add_argument("--keep-gap", type=float, default=0.12)
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")  # Bangla in the summary; Windows consoles default to cp1252

    proj = os.path.abspath(args.project)
    work = os.path.join(proj, "work")
    os.makedirs(os.path.join(proj, "assets"), exist_ok=True)
    os.makedirs(work, exist_ok=True)

    duration = probe_duration(args.video)
    silences = detect_silences(args.video, args.silence_db, args.min_silence)
    cues = parse_srt(args.srt)
    retakes = find_retakes(cues)
    keep = keep_ranges(duration, silences, retakes, args.keep_gap, (cues[0]["start"], cues[-1]["end"]))
    total = round(sum(b - a for a, b in keep), 3)
    words = build_words(cues, keep, retakes)
    punches = build_punches(keep, total)
    countries = find_countries(words)

    data = {
        "source": os.path.abspath(args.video), "srt": os.path.abspath(args.srt),
        "source_duration": round(duration, 3), "duration": total, "keep": keep, "punches": punches,
        "retakes": [{"from": a, "to": b, "text": t} for a, b, t in retakes],
        "countries": countries, "words": words,
    }
    with open(os.path.join(proj, "data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    with open(os.path.join(proj, "words.txt"), "w", encoding="utf-8") as f:
        for w in words:
            f.write(f"{w['i']:4d}  {w['start']:7.3f}  {w['text']}\n")

    print(f"source {duration:.2f}s -> cut {total:.2f}s ({len(keep)} kept ranges, {len(silences)} silences trimmed)")
    print(f"retakes dropped: {len(retakes)}")
    for r in retakes:
        print(f"  {r[0]:.2f}-{r[1]:.2f}s  {r[2][:70]}")
    print(f"words: {len(words)}  punches: {len(punches)}")
    print("countries:", ", ".join(f"{c['code']}@{c['time']:.2f}s ({c['text']})" for c in countries) or "none")
    if not args.no_encode:
        encode(args.video, keep, os.path.join(proj, "assets", "cut.mp4"), work)
        print("encoded assets/cut.mp4")


if __name__ == "__main__":
    sys.exit(main())
