from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .scrapers import download_complaints_zip


DATA_DIR = Path("data/input")

app = FastAPI(title="CFPB NLP Pipeline")

# 🔓 CORS – allow frontend (Next.js) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # OK for local dev; restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- MODELS ----------

class StatusResponse(BaseModel):
    message: str


class PredictRequest(BaseModel):
    text: str


class PredictResponse(BaseModel):
    model: str
    predicted_label: str
    confidence: float | None = None


class EdaSummary(BaseModel):
    n_rows: int
    n_cols: int
    missing_pct: Dict[str, float]
    duplicate_rows: int

    top_products: Dict[str, int]
    top_issues: Dict[str, int]
    top_companies: Dict[str, int]
    top_states: Dict[str, int]
    submitted_via: Dict[str, int]

    label_column: str
    n_classes: int
    class_distribution: Dict[str, int]
    rare_classes: Dict[str, int]

    narrative_missing_pct: float
    n_after_drop_narratives: int
    word_count_stats: Dict[str, float]


class EdaPlots(BaseModel):
    product_counts: Dict[str, int]
    top_states: Dict[str, int]
    submitted_via_counts: Dict[str, int]
    monthly_complaints: List[Dict[str, Any]]  # {date: "2025-10", count: int}
    narrative_hist: List[Dict[str, Any]]      # {bin_start, bin_end, count}
    word_count_stats: Dict[str, float]


# ---------- HELPERS ----------

def load_complaints_csv() -> pd.DataFrame:
    csv_files = list(DATA_DIR.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(
            f"No CSV files found in {DATA_DIR.resolve()}. "
            "Run /scrape first to download complaints.csv."
        )
    return pd.read_csv(csv_files[0], nrows=100_000)


# ---------- ROUTES ----------

@app.get("/health", response_model=StatusResponse)
async def health():
    return StatusResponse(message="ok")


# 1️⃣ Scraper phase
@app.post("/scrape", response_model=StatusResponse)
async def scrape():
    csv_path = download_complaints_zip(DATA_DIR)
    return StatusResponse(message=f"Downloaded and extracted to {csv_path}")


# 2️⃣ EDA plots for frontend visualizations
@app.get("/eda/plots", response_model=EdaPlots)
async def eda_plots():
    df = load_complaints_csv()

    # 1. Product class imbalance
    product_counts = df["Product"].value_counts().to_dict()

    # 2. Top 10 states
    top_states = df["State"].value_counts().head(10).to_dict()

    # 3. Submitted via
    submitted_via_counts = df["Submitted via"].value_counts().to_dict()

    # 4. Monthly complaints
    date_col = "Date sent to company"
    df_dates = df.copy()
    df_dates[date_col] = pd.to_datetime(df_dates[date_col])
    df_dates.set_index(date_col, inplace=True)
    monthly = df_dates["Product"].resample("ME").count()
    monthly_complaints = [
        {"date": d.strftime("%Y-%m"), "count": int(c)}
        for d, c in monthly.items()
    ]

    # 5. Narrative length histogram (characters)
    narrative_len = df["Consumer complaint narrative"].dropna().str.len()
    counts, bin_edges = np.histogram(narrative_len, bins=30, range=(0, 4000))
    narrative_hist: List[Dict[str, Any]] = []
    for i in range(len(counts)):
        narrative_hist.append(
            {
                "bin_start": int(bin_edges[i]),
                "bin_end": int(bin_edges[i + 1]),
                "count": int(counts[i]),
            }
        )

    # 6. Word-count stats
    df_text = df.dropna(subset=["Consumer complaint narrative"]).copy()
    df_text["word_count"] = df_text["Consumer complaint narrative"].apply(
        lambda x: len(str(x).split())
    )
    wc = df_text["word_count"]
    word_count_stats = {
        "count": float(wc.count()),
        "mean": float(wc.mean()),
        "std": float(wc.std()),
        "min": float(wc.min()),
        "p50": float(wc.quantile(0.5)),
        "p75": float(wc.quantile(0.75)),
        "p90": float(wc.quantile(0.9)),
        "p95": float(wc.quantile(0.95)),
        "p99": float(wc.quantile(0.99)),
        "max": float(wc.max()),
    }

    return EdaPlots(
        product_counts=product_counts,
        top_states=top_states,
        submitted_via_counts=submitted_via_counts,
        monthly_complaints=monthly_complaints,
        narrative_hist=narrative_hist,
        word_count_stats=word_count_stats,
    )


# 3️⃣ Baseline phase (placeholder prediction)
@app.post("/baseline/predict", response_model=PredictResponse)
async def baseline_predict(req: PredictRequest):
    return PredictResponse(
        model="baseline_nb",
        predicted_label="Credit Reporting",
        confidence=0.65,
    )


# 4️⃣ Transformer phase (placeholder prediction)
@app.post("/transformer/predict", response_model=PredictResponse)
async def transformer_predict(req: PredictRequest):
    return PredictResponse(
        model="distilbert",
        predicted_label="Debt Collection",
        confidence=0.91,
    )