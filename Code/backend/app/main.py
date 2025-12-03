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

class ClassMetric(BaseModel):
    label: str
    precision: float
    recall: float
    f1: float
    support: int


class BaselineMetrics(BaseModel):
    macro_f1: float
    accuracy: float

    macro_precision: float
    macro_recall: float

    weighted_precision: float
    weighted_recall: float
    weighted_f1: float

    per_class: List[ClassMetric]

class DistilbertTrainingInfo(BaseModel):
    num_labels: int
    train_samples: int
    val_samples: int
    epochs: int
    batch_size: int
    learning_rate: float
    warmup_steps: int
    weight_decay: float
    bf16: bool
    total_steps_approx: int
    training_minutes: float
    peak_gpu_gb: float
    gpu_name: str


class DistilbertMetrics(BaseModel):
    accuracy: float
    macro_f1: float
    training: DistilbertTrainingInfo

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

@app.get("/baseline/metrics", response_model=BaselineMetrics)
async def baseline_metrics():
    per_class = [
        ClassMetric(
            label="Bank account or service",
            precision=0.93,
            recall=0.03,
            f1=0.05,
            support=2977,
        ),
        ClassMetric(
            label="Checking or savings account",
            precision=0.57,
            recall=0.88,
            f1=0.70,
            support=31832,
        ),
        ClassMetric(
            label="Consumer Loan",
            precision=0.47,
            recall=0.00,
            f1=0.01,
            support=1892,
        ),
        ClassMetric(
            label="Credit Reporting",
            precision=0.92,
            recall=0.93,
            f1=0.93,
            support=474638,
        ),
        ClassMetric(
            label="Credit card",
            precision=0.48,
            recall=0.20,
            f1=0.28,
            support=19950,
        ),
        ClassMetric(
            label="Credit card or prepaid card",
            precision=0.41,
            recall=0.60,
            f1=0.49,
            support=21733,
        ),
        ClassMetric(
            label="Debt collection",
            precision=0.71,
            recall=0.64,
            f1=0.67,
            support=77267,
        ),
        ClassMetric(
            label="Debt or credit management",
            precision=0.58,
            recall=0.01,
            f1=0.03,
            support=799,
        ),
        ClassMetric(
            label="Money transfer, virtual currency, or money service",
            precision=0.96,
            recall=0.53,
            f1=0.68,
            support=21320,
        ),
        ClassMetric(
            label="Money transfers",
            precision=0.47,
            recall=0.02,
            f1=0.04,
            support=299,
        ),
        ClassMetric(
            label="Mortgage",
            precision=0.75,
            recall=0.93,
            f1=0.83,
            support=27304,
        ),
        ClassMetric(
            label="Other financial service",
            precision=0.00,
            recall=0.00,
            f1=0.00,
            support=58,
        ),
        ClassMetric(
            label="Payday loan",
            precision=0.00,
            recall=0.00,
            f1=0.00,
            support=349,
        ),
        ClassMetric(
            label="Payday loan, title loan, or personal loan",
            precision=0.47,
            recall=0.15,
            f1=0.22,
            support=3447,
        ),
        ClassMetric(
            label="Payday loan, title loan, personal loan, or advance loan",
            precision=0.53,
            recall=0.08,
            f1=0.13,
            support=2504,
        ),
        ClassMetric(
            label="Prepaid card",
            precision=0.79,
            recall=0.26,
            f1=0.40,
            support=1894,
        ),
        ClassMetric(
            label="Student loan",
            precision=0.76,
            recall=0.81,
            f1=0.78,
            support=11496,
        ),
        ClassMetric(
            label="Vehicle loan or lease",
            precision=0.55,
            recall=0.60,
            f1=0.57,
            support=8995,
        ),
        ClassMetric(
            label="Virtual currency",
            precision=0.00,
            recall=0.00,
            f1=0.00,
            support=3,
        ),
    ]

    return BaselineMetrics(
        macro_f1=0.3589,
        accuracy=0.83,
        macro_precision=0.54,
        macro_recall=0.35,
        weighted_precision=0.84,
        weighted_recall=0.83,
        weighted_f1=0.82,
        per_class=per_class,
    )

@app.get("/transformer/metrics", response_model=DistilbertMetrics)
async def transformer_metrics():
    # All numbers are taken from your DistilBERT notebook / PDF  [oai_citation:0‡vertopal.com_Fine_tuned_DistilBERT.pdf](sediment://file_00000000b9cc71f59bcdb722d9bb25a4)
    return DistilbertMetrics(
        accuracy=0.9104,
        macro_f1=0.6041,
        training=DistilbertTrainingInfo(
            num_labels=19,
            train_samples=2_829_792,
            val_samples=707_449,
            epochs=3,
            batch_size=32,
            learning_rate=2e-5,
            warmup_steps=500,
            weight_decay=0.01,
            bf16=True,
            total_steps_approx=265_293,
            training_minutes=277.65,
            peak_gpu_gb=4.45,
            gpu_name="NVIDIA A100-SXM4-40GB",
        ),
    )