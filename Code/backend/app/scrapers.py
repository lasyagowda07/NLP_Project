from pathlib import Path
from io import BytesIO
import zipfile

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.consumerfinance.gov/data-research/consumer-complaints/#get-the-data"
DOWNLOAD_TEXT = "Download all complaint data | CSV"
DEFAULT_DEST_DIR = Path("data/input")


def download_complaints_zip(dest_dir: Path = DEFAULT_DEST_DIR) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)

    # If file already exists → return immediately
    existing_csv = list(dest_dir.glob("*.csv"))
    if existing_csv:
        print("⚠️ CSV already exists. Skipping download.")
        return "data/input/"

    print("[1/4] Fetching page…")
    headers = {"User-Agent": "cfpb-complaints-downloader/1.0"}
    resp = requests.get(BASE_URL, headers=headers, timeout=30)
    resp.raise_for_status()

    print("[2/4] Parsing HTML and locating CSV download link…")
    soup = BeautifulSoup(resp.text, "html.parser")

    link = None
    for a in soup.find_all("a", class_="a-link"):
        if a.get_text(strip=True) == DOWNLOAD_TEXT:
            link = a
            break

    if link is None:
        raise RuntimeError(f"Could not find link with text {DOWNLOAD_TEXT!r}")

    href = link.get("href")
    if not href.startswith("http"):
        href = requests.compat.urljoin(BASE_URL, href)

    print(f"[3/4] Downloading zip from: {href}")
    zip_resp = requests.get(href, headers=headers, timeout=120)
    zip_resp.raise_for_status()

    zip_bytes = BytesIO(zip_resp.content)

    print(f"[4/4] Extracting zip into: {dest_dir.resolve()}")
    with zipfile.ZipFile(zip_bytes) as zf:
        zf.extractall(dest_dir)

    # return the CSV path if present
    csv_candidates = list(dest_dir.glob("*.csv"))
    return "data/input/"