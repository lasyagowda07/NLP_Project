"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const BACKEND_URL = "http://localhost:8000";

export default function TransformerPage() {
  const [output, setOutput] = useState<string>("");

  async function predictWithTransformer() {
    const text = prompt(
      "Enter a complaint text to classify with the DistilBERT model:",
    );
    if (!text) return;

    setOutput("Calling /transformer/predict …");
    try {
      const res = await fetch(`${BACKEND_URL}/transformer/predict`, {
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
      <h1 className="text-2xl font-semibold">4. Transformer (DistilBERT)</h1>
      <p className="max-w-xl text-sm text-slate-300">
        Send the same complaint through the fine-tuned DistilBERT model and
        compare its performance against the baseline.
      </p>
      <Button
        onClick={predictWithTransformer}
        className="bg-fuchsia-600 hover:bg-fuchsia-500"
      >
        Predict with DistilBERT
      </Button>
      <pre className="whitespace-pre-wrap rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        {output || "Transformer prediction output will appear here…"}
      </pre>
    </div>
  );
}