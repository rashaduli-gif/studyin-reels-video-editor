# StudyIn reels

This repository turns a raw vertical talking-head video plus its Bangla/Banglish voice-over SRT into a finished "Study Abroad Talks" Instagram reel. All of the work is done by the project skill in `.claude/skills/studyin-reel/`: read its `SKILL.md` before doing anything and follow its house style; don't re-ask style questions it settles.

The creator writes in Banglish and usually sends share links (Google Drive or Dropbox) to the video and the SRT, plus the Part number.

## Every cloud session

1. Run `bash setup/cloud-setup.sh` once (idempotent, a few minutes the first time). It installs ffmpeg, Node 22, gdown and the libraries the headless renderer needs.
2. Fetch the inputs: `python3 -I .claude/skills/studyin-reel/scripts/fetch.py <video-link> <srt-link> ~/reels/inputs`.
3. Follow the skill with `P=~/reels/<slug>` (e.g. `part-3`). Raw media and projects stay in `~/reels`, never in the repository.

## Delivering

The creator downloads results from GitHub, so:

- Copy each preview or final into `renders/<slug>/` (e.g. `renders/part-3/preview_v1.mp4`), commit it, and push the session branch.
- Keep every file under 100 MB (GitHub's limit): the `-q draft` preview is about 50 MB; render the final with `--video-bitrate 9M`.
- Reply with the GitHub link to the file and a short note of what to check. Render the final only after the creator says OK.
- Never commit the raw input video, `node_modules`, or anything from `~/reels`.
