"""Downloads the creator's video / SRT from a share link into a folder (for cloud sessions).

Handles Google Drive file links (via gdown, which gets past Drive's large-file warning page),
Dropbox links (forces dl=1) and plain direct URLs.

Usage: python -I fetch.py <url> <dest-folder> [<url> ...]
Prints the saved path of each file.
"""
import os
import re
import subprocess
import sys
import urllib.request


def drive_id(url):
    m = re.search(r"/d/([\w-]{20,})", url) or re.search(r"[?&]id=([\w-]{20,})", url)
    return m.group(1) if m else None


def fetch(url, dest):
    os.makedirs(dest, exist_ok=True)
    fid = drive_id(url) if "drive.google.com" in url or "docs.google.com" in url else None
    if fid:
        try:
            import gdown  # noqa: F401
        except ImportError:
            subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "gdown"], check=True)
        out = subprocess.run(
            [sys.executable, "-m", "gdown", "--fuzzy", url, "-O", dest + os.sep],
            check=True, capture_output=True, text=True,
        )
        saved = [l for l in (out.stdout + out.stderr).splitlines() if l.startswith("To:")]
        return saved[-1][3:].strip() if saved else dest
    if "dropbox.com" in url:
        url = re.sub(r"([?&])dl=0", r"\1dl=1", url)
        if "dl=1" not in url:
            url += ("&" if "?" in url else "?") + "dl=1"
    name = os.path.basename(url.split("?")[0]) or "download"
    path = os.path.join(dest, name)
    with urllib.request.urlopen(url) as r, open(path, "wb") as f:
        cd = r.headers.get("Content-Disposition", "")
        m = re.search(r'filename="?([^";]+)"?', cd)
        while chunk := r.read(1 << 20):
            f.write(chunk)
    if m and m.group(1) != name:
        final = os.path.join(dest, m.group(1))
        os.replace(path, final)
        path = final
    return path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    *urls, dest = sys.argv[1:]
    for u in urls:
        print(fetch(u, dest))
