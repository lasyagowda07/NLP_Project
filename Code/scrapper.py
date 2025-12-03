"""
Download CFPB complaints CSV zip from:
https://www.consumerfinance.gov/data-research/consumer-complaints/#get-the-data

Steps:
1. Fetch page
2. Find "Download all complaint data | CSV" link
3. Download complaints.csv.zip
4. Extract into data/input/
"""

import os
import sys
import zipfile
from io import BytesIO
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.consumerfinance.gov/data-research/consumer-complaints/#get-the-data"
DOWNLOAD_TEXT = "Download all complaint data | CSV"
DEFAULT_DEST_DIR = Path("data/input")


def download_complaints_zip(dest_dir: Path = DEFAULT_DEST_DIR) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)

    print("[1/4] Fetching page…")
    headers = {
        "User-Agent": "cfpb-complaints-downloader/1.0 (github.com/you)"
    }
    resp = requests.get(BASE_URL, headers=headers, timeout=30)
    resp.raise_for_status()

    print("[2/4] Parsing HTML and locating CSV download link…")
    soup = BeautifulSoup(resp.text, "html.parser")

    # Find the <a> whose visible text matches our link label
    link = None
    for a in soup.find_all("a", class_="a-link"):
        if a.get_text(strip=True) == DOWNLOAD_TEXT:
            link = a
            break

    if link is None:
        raise RuntimeError(f"Could not find link with text: {DOWNLOAD_TEXT!r}")

    href = link.get("href")
    if not href.startswith("http"):
        # In case it's a relative URL
        href = requests.compat.urljoin(BASE_URL, href)

    print(f"[3/4] Downloading zip from: {href}")
    zip_resp = requests.get(href, headers=headers, timeout=120, stream=True)
    zip_resp.raise_for_status()

    # We stream into memory here; if file gets too big, stream to disk instead
    zip_bytes = BytesIO(zip_resp.content)

    print(f"[4/4] Extracting zip into: {dest_dir.resolve()}")
    with zipfile.ZipFile(zip_bytes) as zf:
        zf.extractall(dest_dir)

    print("✅ Done. Extracted files:")
    for p in dest_dir.iterdir():
        print("   -", p.name)

    # Return path to the main CSV if present
    csv_candidates = list(dest_dir.glob("*.csv"))
    return csv_candidates[0] if csv_candidates else dest_dir


if __name__ == "__main__":
    # Allow optional custom output dir: `python script.py some/dir`
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DEST_DIR
    csv_path = download_complaints_zip(out_dir)
    print(f"\nMain CSV at: {csv_path}")