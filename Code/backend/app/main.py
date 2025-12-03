from pathlib import Path
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from .scrapers import download_complaints_zip

app = FastAPI(title="CFPB NLP Pipeline")

# Allow frontend (Next.js) to call FastAPI
origins = ["*"]  # fine for local dev; tighten later for prod

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # who can talk to backend
    allow_credentials=True,
    allow_methods=["*"],            # allow all HTTP methods (GET, POST, etc)
    allow_headers=["*"],            # allow all headers
)

DATA_DIR = Path("data/input")


class StatusResponse(BaseModel):
    message: str


class PredictRequest(BaseModel):
    text: str


class PredictResponse(BaseModel):
    model: str
    predicted_label: str
    confidence: float | None = None


@app.get("/health", response_model=StatusResponse)
async def health():
    return StatusResponse(message="ok")


# 1️⃣ Scraper phase
@app.post("/scrape", response_model=StatusResponse)
async def scrape():
    csv_path = download_complaints_zip(DATA_DIR)
    return StatusResponse(message=f"Downloaded and extracted to {csv_path}")


# 2️⃣ EDA phase (placeholder – later you can compute real stats)
@app.get("/eda/summary", response_model=dict)
async def eda_summary():
    return {
        "rows": 100_000,
        "columns": 18,
        "missing_narratives_pct": 71,
        "note": "Placeholder EDA summary – plug in your real stats later.",
    }


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