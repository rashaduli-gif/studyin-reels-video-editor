---
name: studyin-reel
description: Turn a raw vertical talking-head video plus its Bangla/Banglish voice-over SRT into a finished StudyIn Instagram reel (Study Abroad Talks series) with HyperFrames — silence and retake cuts, big kinetic key-phrase captions in the StudyIn brand palette, waving country flags behind the speaker, punch-in zooms, matched sound effects and upbeat background music, previewed first and rendered at 1080x1920 after approval. Use this whenever the user uploads or points to a video (.mp4/.mov) together with an .srt and wants it edited, cut, captioned or made into a reel/short, mentions "Study Abroad Talks", "Part 3/4…", StudyIn, or writes things like "video edit kore dao", "reel banao", "ager motoi edit koro" — even if they don't name this skill.
---

# StudyIn reel

The creator uploads two things: a raw vertical talking-head video and the voice-over SRT (Bangla + English mixed). Everything else is on you, in the house style below, which was settled over many rounds of feedback. Don't re-ask style questions it already answers.

## What to ask (and only this)

- **Part number** for the title ("Part - N"), if the user didn't say it. If they say there is no part, drop that line.
- Nothing else up front. Show a preview instead of asking; the creator reacts to previews.

The creator writes Banglish; reply in simple English or Banglish, short, with timestamps when you refer to moments.

## House style (and why)

| Area | Rule | Why |
|---|---|---|
| Canvas | 1080x1920, 30 fps, everything inside the Instagram safe zone | Reels |
| Cuts | Silences ≥0.3 s at −28 dB trimmed to ~0.12 s of air; repeated takes removed, **last clean take kept** | Original brief |
| Zoom | Punch-in on every cut, alternating 100% / 108%, never more than ~4 s apart, slow 2% push between | Hides jump cuts, keeps energy |
| Captions | **Key phrases only**, big kinetic text — not word-by-word subtitles | Creator chose the reference style (Video_V1.4) |
| Caption size | sm 60 / md 86 / bg 128 / xl 178 px, auto-shrunk only if a line would exceed 920 px | "text gula choto keno" — they want them big |
| Caption position | Every phrase sits low on the chest, block bottom at y≈1470; never at the top over the face | "text aro niche" + top text covered the eyes |
| Fonts | DM Sans (Latin) + Hind Siliguri (Bangla fallback) | Brand font is DM Sans; it has no Bangla glyphs |
| Colours | StudyIn palette only: White, Cherry #F7003B, Blossom #F7A5F9, Mint #A6F970, Ice #00DAFF; pills Cobalt #2017CE+White, Mint+Navy, Cherry+White; shadows Navy #020F30 | Brand sheet (pairings: Navy&Ice/Cherry/Mint/Blossom, Cobalt&Ice/Blossom/Mint/White, Pine&Blossom/Mint/Ice) |
| Spelling | British: Programme / Programmes (capital P), etc. | "programs is incorrect" |
| Title | `WELCOME TO` (Blossom, tracked) / `STUDY ABROAD TALKS` (one line, white) / `Part - N` (Cherry pill) — no "with Yamim" | Explicit request |
| Flags | When a country is named, its flag waves **behind** the speaker (speaker cut out with `remove-background`), fading out by mid-frame | Reference style; "flag on my behind" |
| SFX | chime, ding, whoosh, riser, sparkle, impact, swish, pop — matched to meaning. **No "wrong" buzz, no question glide** | Creator removed those two |
| Music | Upbeat hopeful bed (`music.js`, 100 BPM) about 13 dB under the voice (−29.5 vs −16 LUFS) unless the user supplies a track | "BG music that matches best" |
| Removed for good | No logo bug, no outro, no light-leak flash | "logo remove koro… outro dio na" |
| Delivery | Draft preview first; final `-q high` render **only after the user's OK**; then offer to copy to Downloads | Asked every time |

## Where you are running

The same steps work in two places; only paths, setup, the browser and delivery differ.

| | This Windows PC (Claude desktop app) | Cloud session (Claude Code on the web, repo `studyin-reels`) |
|---|---|---|
| Inputs | Local file paths the user gives | Usually share links: `python3 -I $SKILL/scripts/fetch.py <video-url> <srt-url> ~/reels/inputs` (Google Drive, Dropbox or direct links). Uploaded files: use their path. |
| Project `P` | `$env:USERPROFILE\Videos\studyin-reels\<slug>` (short path: Windows MAX_PATH) | `~/reels/<slug>` — outside the repo so raw media is never committed |
| Setup | `powershell -ExecutionPolicy Bypass -File "$SKILL\scripts\setup.ps1" -Project $P` | `bash $SKILL/scripts/setup.sh $P` (run the repo's `setup/cloud-setup.sh` first if ffmpeg/Node 22 are missing) |
| Browser for render | `$env:HYPERFRAMES_BROWSER_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"` | `npx hyperframes browser ensure` once in `P` |
| Deliver | Send the file; offer to copy to Downloads | Copy into the repo's `renders/<slug>/`, commit and push the branch, give the user the GitHub link to the file. Files must stay under 100 MB (GitHub's limit): preview `-q draft` is ~50 MB; final with `--video-bitrate 9M` (~70 MB for 60 s) |

`SKILL` = this skill's folder. Commands below are PowerShell-flavoured; in the cloud use the same scripts with `/` paths and `python3`.

## Workflow

1. **Setup** (once per video, ~1 min) — the setup command from the table. Installs hyperframes@0.8.214 + fonts into `P`, writes the SFX kit to `P/assets/sfx`.

2. **Prep** — cut + timeline (~2–4 min, encodes):
   ```powershell
   python -I "$SKILL\scripts\prep.py" --video "<video>" --srt "<srt>" --project $P
   node "$SKILL\scripts\music.js" $P
   ```
   Read its summary: cut length, retakes dropped (check each listed one really is a repeat — the detector compares the first 4 words of nearby cues), detected countries. Then read `P\words.txt` (index, time on the cut timeline, word). Fix obvious SRT typos in your captions (not in the SRT).

3. **Write `P\reel.json`** — the creative step. If the user pastes a beat plan / reel.json from their claude.ai Project ("Motion Video Project"), its times are SRT (source) times: save it as `P\plan.json` and run `node "$SKILL\scripts\remap.js" $P $P\plan.json`, then review the result against `words.txt` and fix anything off instead of writing from scratch. Otherwise write it yourself. Format and a full worked example: `references/reel-format.md` and `references/example-part2.reel.json` (the approved Part 2 reel). Read both before writing. Guidelines:
   - First phrase = the title (0 → ~2.1 s). Then one phrase per beat: questions, answers, numbers, steps, country names, CTA. Roughly one phrase every 2–4 s; it's fine to leave short gaps.
   - Each line's `at` = the time of the word it shows (from `words.txt`), so text lands as it's spoken. Phrase `e` ≈ next phrase start or a beat after its last line.
   - 1–3 lines per phrase, mixing sizes (small lead-in + big keyword). Highlight one or two words per phrase in colour; numbers go in pills; "?" as a `q` span; negatives can use `x` or a Cherry `ul` underline.
   - `sfx` on lines whose highlighted word deserves a sound; match meaning (table in `references/reel-format.md`). Not every line.
   - `flags`: one entry per country mention, from about the country word until ~2.5 s later (shorter if two countries follow each other back to back). Codes in `scripts/lib.js` (uk, my, au, nz, ca, us, ie, fr, it, be, de, nl, hu, lt, at, pl, es, jp, kr, cn, ae, se, fi, dk, no, ch, tr, sg). Missing country → skip the flag and mention it.

4. **Cutouts + build** (cutouts run ~1 min per flag segment on CPU; first run downloads the model):
   ```powershell
   node "$SKILL\scripts\cutouts.js" $P
   node "$SKILL\scripts\build.js" $P
   cd $P; npx hyperframes lint
   ```
   Lint must show 0 errors (the `nested_structure_needs_subcomposition` warnings are expected and harmless).

5. **Look before rendering**: `npx hyperframes snapshot --at <t1,t2,…> --no-end -o $P\out\snaps` at the title, each flag, each pill/number and the CTA; read the contact sheet. Check: nothing covers the face, no line touches the frame edge, colours match the palette, Bangla renders (no boxes).

6. **Draft preview** (set up the browser first — see the table):
   ```powershell
   npx hyperframes render -q draft -w 4 -o $P\out\preview_v1.mp4
   ```
   (~3 min on this PC, longer on a cloud CPU; run it in the background.) Verify: duration matches `data.json`, `ffmpeg -i … -af ebur128` integrated loudness ≈ −16 to −17 LUFS, a few extracted frames look right. Deliver it (see the table) with a short list of what's in it and anything uncertain (e.g. "phrase timing comes from SRT lines, may be ±0.3 s"). Ask whether to render the final.

7. **Changes** → edit `reel.json` (or the style in `build.js` if it's a house-style change — then also update this skill), rebuild, snapshot the changed moments, re-render `preview_v2`, and so on.

8. **Final** only on an explicit OK:
   ```powershell
   npx hyperframes render -q high -w 4 -o "$P\out\<Name>_final.mp4"
   ```
   In the cloud add `--video-bitrate 9M` so the file fits GitHub. (~6–7 min here.) Verify 1080x1920, 30 fps, duration, loudness, frames; deliver it (see the table).

## Windows gotchas (all hit before)

- **Long paths**: if a HyperFrames command fails with `ENAMETOOLONG`/`ENOENT` on a temp dir, map the project to a drive letter (`subst S: $P`) and run from `S:\`.
- **Render can't find a browser**: set `HYPERFRAMES_BROWSER_PATH` to the system Chrome (above) — `snapshot` works without it, `render` doesn't.
- **Don't use Remotion here**: Windows Defender deletes its `remotion.exe` compositor on install.
- **Don't pipe a render into `Select-Object -First N`**: it stops the upstream process and kills the render mid-way. Use `-Last N`, or run it in the background and read the log.
- **Python**: run scripts with `python -I` (`python3 -I` on Linux).
- Background-removal output is VP9-alpha WebM; ffmpeg needs `-c:v libvpx-vp9` before `-i` to read its alpha when checking it.
