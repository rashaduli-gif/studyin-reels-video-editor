# reel.json format

`build.js` reads `P\reel.json` (your creative decisions) and `P\data.json` (from `prep.py`: cut duration, punch-in times, word timings). All times are seconds on the **cut** timeline — the times in `words.txt`.

```json
{
  "phrases": [
    {
      "s": 0.0, "e": 2.1,
      "lines": [
        { "spans": [["WELCOME TO", "sm p track"]], "sfx": "swish" },
        { "at": 0.6, "spans": [["STUDY ABROAD TALKS", "bg w"]], "sfx": "whoosh" },
        { "at": 1.25, "spans": [["Part - 3", "md pill-r"]], "sfx": "pop" }
      ]
    }
  ],
  "flags": [ { "code": "uk", "s": 19.05, "e": 21.6 } ],
  "music": { "src": "assets/music.wav", "volume": 0.13 }
}
```

## phrases

- `s`, `e`: when the phrase block is on screen. It exits with a quick fade in its last 0.17 s, so leave `e` a beat after the last line lands and don't overlap the next phrase.
- `lines[]`: stacked, centred. Each line pops in at `at` (default `s + 0.15 × index`).
- `spans`: `[text, classes]` pieces of one line, rendered side by side. Put spaces inside the text where needed (`[" বা ", "md w"]`).
- `sfx` (optional): the effect played as that line lands.

### Span classes

Size (one): `sm` 60 px · `md` 86 px · `bg` 128 px · `xl` 178 px. A line wider than 920 px is shrunk automatically, so long lines are safe, but prefer short ones (≈5 English words or ≈4 Bangla words per line).

Colour (one): `w` White · `r` Cherry · `p` Blossom · `g` Mint · `c` Ice.

Extras:
- `pill-c` Cobalt pill + white text (numbers: `["3.0", "bg pill-c"]`)
- `pill-g` Mint pill + Navy text
- `pill-r` Cherry pill + white text (FREE, Part - N)
- `ul` animated Cherry underline (e.g. `["কম", "md r ul"]`)
- `track` wide letter-spacing (small caps-style labels)
- `["?", "q"]` big Cherry question mark that spins in
- `["", "x"]` Cherry ✕ badge

Rhythm that worked: small white lead-in → big coloured keyword → medium follow-up. Use a different colour for each of a line's highlights so they don't blur together. Cherry is for emphasis/negatives, Mint for positives and answers, Blossom for topics, Ice for labels/categories.

## sfx — match the meaning

| sfx | Use on |
|---|---|
| `whoosh` | title, country names with flags, big topic reveals |
| `riser` | "Foundation", "Pathway", a programme/next step being introduced |
| `ding` | numbers and requirements in pills (GPA 3.0, IELTS 5.5–6) |
| `yes` | yes/positive answers ("হ্যাঁ!", "অবশ্যই") |
| `impact` | a strong "না!" / punchline |
| `sparkle` | FREE, offers, rewards |
| `chime` | the brand name in the CTA (Bangladesh StudyIn) |
| `swish` | underlined words, small labels |
| `pop` | other highlighted words |

There is deliberately no "wrong" buzz or question sound — the creator removed both. About one sound per phrase is plenty; leave plain lead-in lines silent.

## flags

`{ "code", "s", "e" }` — waving flag behind the speaker from `s` to `e`. Flags that follow each other within 0.3 s share one cutout clip (e.g. Australia → Canada). `cutouts.js` caches cutouts per segment, so changing only captions doesn't redo them; changing a flag's timing does.

## music

Defaults to the generated `assets/music.wav` at volume 0.13 (≈13 dB under the voice). For a user-supplied track, copy it into `P\assets\` and set `src`; then measure with `ffmpeg -i <track> -af "volume=<v>,ebur128"` and pick a volume that lands near −29 LUFS.
