#!/usr/bin/env bash
# Creates a StudyIn reel project folder with HyperFrames, fonts and the SFX kit (Linux / macOS / cloud).
# Usage: bash setup.sh <project-folder>
set -euo pipefail
P="$1"
SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$P/assets/fonts" "$P/assets/sfx" "$P/out"
cd "$P"
name="$(basename "$P" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-\n' '-')"

[ -f package.json ] || cat > package.json <<EOF
{
  "name": "$name",
  "private": true,
  "type": "module",
  "scripts": {
    "check": "npx --yes hyperframes@0.8.214 check",
    "render": "npx --yes hyperframes@0.8.214 render"
  }
}
EOF
[ -f hyperframes.json ] || cat > hyperframes.json <<'EOF'
{
  "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
  "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  "paths": { "blocks": "compositions", "components": "compositions/components", "assets": "assets" },
  "media": { "autoProxy": true }
}
EOF
[ -f meta.json ] || echo "{ \"id\": \"$name\", \"name\": \"$name\", \"createdAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" }" > meta.json

[ -d node_modules/hyperframes ] || npm install --no-audit --no-fund hyperframes@0.8.214 @fontsource/dm-sans@5.1.0 @fontsource/hind-siliguri@5.1.0 | tail -n 2

for f in dm-sans-latin-400-normal dm-sans-latin-500-normal dm-sans-latin-800-normal \
         hind-siliguri-bengali-500-normal hind-siliguri-bengali-700-normal; do
  cp "$(find node_modules/@fontsource -name "$f.woff2" | head -n 1)" "assets/fonts/$f.woff2"
done

node "$SKILL/sfx.js" "$P" > /dev/null
echo "project ready: $P"
