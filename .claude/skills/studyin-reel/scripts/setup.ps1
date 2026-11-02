# Creates a StudyIn reel project folder with HyperFrames, fonts and the SFX kit.
# Usage: powershell -ExecutionPolicy Bypass -File setup.ps1 -Project <folder>
param([Parameter(Mandatory = $true)][string]$Project)

$ErrorActionPreference = "Stop"
$skill = Split-Path -Parent $PSCommandPath
New-Item -ItemType Directory -Force "$Project\assets\fonts", "$Project\assets\sfx", "$Project\out" | Out-Null
Set-Location $Project

if (-not (Test-Path package.json)) {
  $name = (Split-Path -Leaf $Project).ToLower() -replace "[^a-z0-9-]", "-"
  @"
{
  "name": "$name",
  "private": true,
  "type": "module",
  "scripts": {
    "check": "npx --yes hyperframes@0.8.214 check",
    "render": "npx --yes hyperframes@0.8.214 render"
  }
}
"@ | Out-File -Encoding ascii package.json
}
if (-not (Test-Path hyperframes.json)) {
  @"
{
  "`$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
  "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  "paths": { "blocks": "compositions", "components": "compositions/components", "assets": "assets" },
  "media": { "autoProxy": true }
}
"@ | Out-File -Encoding ascii hyperframes.json
}
if (-not (Test-Path meta.json)) {
  $id = Split-Path -Leaf $Project
  "{ `"id`": `"$id`", `"name`": `"$id`", `"createdAt`": `"$((Get-Date).ToUniversalTime().ToString('o'))`" }" | Out-File -Encoding ascii meta.json
}

if (-not (Test-Path node_modules\hyperframes)) {
  npm install --no-audit --no-fund hyperframes@0.8.214 @fontsource/dm-sans@5.1.0 @fontsource/hind-siliguri@5.1.0 | Select-Object -Last 2
}

$fonts = "dm-sans-latin-400-normal", "dm-sans-latin-500-normal", "dm-sans-latin-800-normal",
         "hind-siliguri-bengali-500-normal", "hind-siliguri-bengali-700-normal"
foreach ($f in $fonts) {
  $src = Get-ChildItem node_modules\@fontsource -Recurse -Filter "$f.woff2" | Select-Object -First 1
  Copy-Item $src.FullName "assets\fonts\$f.woff2" -Force
}

node "$skill\sfx.js" $Project | Out-Null
Write-Output "project ready: $Project"
