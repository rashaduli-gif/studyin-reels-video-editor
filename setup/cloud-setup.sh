#!/usr/bin/env bash
# One-time (idempotent) tooling for a Claude Code cloud session: ffmpeg, Node 22, gdown,
# and the shared libraries chrome-headless-shell needs for HyperFrames renders.
set -uo pipefail
SUDO=""; [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null && SUDO="sudo"
apt_install() { $SUDO apt-get install -y -qq --no-install-recommends "$@" >/dev/null; }

if command -v apt-get >/dev/null; then
  $SUDO apt-get update -qq >/dev/null
  command -v ffmpeg >/dev/null || apt_install ffmpeg
  apt_install ca-certificates curl python3-pip libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 fonts-liberation
  apt_install libasound2t64 2>/dev/null || apt_install libasound2
fi

node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$node_major" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash - >/dev/null && apt_install nodejs
fi

python3 -c "import gdown" 2>/dev/null || python3 -m pip install --quiet gdown 2>/dev/null \
  || python3 -m pip install --quiet --break-system-packages gdown

echo "ffmpeg: $(ffmpeg -version 2>/dev/null | head -n 1 | cut -d' ' -f3)"
echo "node:   $(node -v 2>/dev/null)"
echo "python: $(python3 --version 2>&1)"
python3 -c "import gdown; print('gdown:  ok')" 2>/dev/null || echo "gdown:  MISSING"
