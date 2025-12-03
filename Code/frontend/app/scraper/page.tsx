"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const BACKEND_URL = "http://localhost:8000";

export default function ScraperPage() {
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  async function callScraper() {
    if (isRunning) return;
    setIsRunning(true);

    setStatusLines(["Calling backend /scrape …"]);

    try {
      const res = await fetch(`${BACKEND_URL}/scrape`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const steps = [
          "[1/4] Fetching page…",
          "[2/4] Parsing HTML and locating CSV download link…",
          "[3/4] Downloading zip from CFPB…",
          "[4/4] Extracting zip into data/input…",
          `✅ ${data.message || "Completed successfully."}`,
        ];

        setStatusLines(steps);
      } else {
        setStatusLines((prev) => [
          ...prev,
          `❌ Scraper failed: ${res.status} ${res.statusText}`,
        ]);
      }
    } catch (err: any) {
      setStatusLines((prev) => [
        ...prev,
        `❌ Network error: ${err?.message ?? "Unknown error"}`,
      ]);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">1. Scraper</h1>
      <p className="max-w-xl text-sm text-slate-300">
        This step downloads the latest CFPB complaint data and extracts it into{" "}
        <code className="rounded bg-slate-900 px-1 py-0.5">data/input/</code>.
      </p>

      <Button
        onClick={callScraper}
        disabled={isRunning}
        className="bg-emerald-600 hover:bg-emerald-500"
      >
        {isRunning ? "Running scraper…" : "Run Scraper"}
      </Button>

      <pre className="whitespace-pre-wrap rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        {statusLines.length === 0
          ? "Status output will appear here…"
          : statusLines.join("\n")}
      </pre>
    </div>
  );
}