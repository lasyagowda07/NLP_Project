"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const BACKEND_URL = "http://localhost:8000";

export default function EdaPage() {
  const [summary, setSummary] = useState<string>("");

  async function loadSummary() {
    setSummary("Loading EDA summary…");
    try {
      const res = await fetch(`${BACKEND_URL}/eda/summary`);
      const data = await res.json();
      setSummary(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setSummary(`Error loading EDA summary: ${err?.message ?? "Unknown"}`);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">2. EDA</h1>
      <p className="max-w-xl text-sm text-slate-300">
        This section will summarize key statistics from the complaint
        dataset, such as row counts, missing values, and class
        distribution.
      </p>
      <Button
        onClick={loadSummary}
        className="bg-indigo-600 hover:bg-indigo-500"
      >
        Load EDA Summary
      </Button>
      <pre className="whitespace-pre-wrap rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        {summary || "EDA summary will appear here…"}
      </pre>
    </div>
  );
}