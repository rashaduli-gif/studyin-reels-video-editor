# StudyIn reels

Edit a "Study Abroad Talks" reel from any device with Claude Code on the web.

## How to use (every new video)

1. Upload the raw video and the voice-over SRT to Google Drive. Set sharing to **Anyone with the link**.
2. Open **claude.ai/code**, pick this repository (`rashaduli-gif/studyin-reels-video-editor`) and your cloud environment.
3. Send something like:

   > Part 3 edit kore dao. Video: <Drive link> SRT: <Drive link>

4. Claude sets everything up, edits, and pushes a **preview** to `renders/part-3/` on its branch. It replies with the link; open it on GitHub and download.
5. Reply with changes, or "OK, render final". The final lands in the same folder.

## One-time setup (already done or done once)

- Claude's GitHub app has access to this repository (claude.ai/code asks the first time).
- A cloud environment with **network access: Full** (Drive downloads and installs need it). Optionally put `bash setup/cloud-setup.sh` in the environment's setup script so it runs at the start of every session.

## What's inside

- `.claude/skills/studyin-reel/`: the editing skill (house style, scripts, example).
- `setup/cloud-setup.sh`: installs ffmpeg, Node 22 and renderer libraries on the cloud machine.
- `renders/`: previews and finals, one folder per video.
