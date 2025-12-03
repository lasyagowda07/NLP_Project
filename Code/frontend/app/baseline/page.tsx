"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const BACKEND_URL = "http://localhost:8000";

export default function BaselinePage() {
  const [output, setOutput] = useState<string>("");

  async function predictWithBaseline() {
    const text = prompt("Enter a complaint text to classify with the baseline:");
    if (!text) return;

    setOutput("Calling /baseline/predict …");
    try {
      const res = await fetch(`${BACKEND_URL}/baseline/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setOutput(
        `Model: ${data.model}\nPredicted label: ${data.predicted_label}\nConfidence: ${
          data.confidence ?? "n/a"
        }`,
      );
    } catch (err: any) {
      setOutput(`Error: ${err?.message ?? "Unknown error"}`);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">3. Baseline (TF-IDF + NB)</h1>
      <p className="max-w-xl text-sm text-slate-300">
        Send a single complaint through the TF-IDF + Naive Bayes model and
        view its predicted product category.
      </p>
      <Button
        onClick={predictWithBaseline}
        className="bg-amber-600 hover:bg-amber-500"
      >
        Predict with Baseline
      </Button>
      <pre className="whitespace-pre-wrap rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        {output || "Baseline prediction output will appear here…"}
      </pre>
    </div>
  );
}