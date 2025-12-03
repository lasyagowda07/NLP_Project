"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const BACKEND_URL = "http://localhost:8000";

type ClassMetric = {
  label: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
};

type BaselineMetrics = {
  macro_f1: number;
  accuracy: number;
  macro_precision: number;
  macro_recall: number;
  weighted_precision: number;
  weighted_recall: number;
  weighted_f1: number;
  per_class: ClassMetric[];
};

export default function BaselinePage() {
  const [metrics, setMetrics] = useState<BaselineMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🎨 colors to match the EDA charts
  const BAR_COLOR_F1 = "#4F46E5"; // indigo
  const BAR_COLOR_PREC = "#22C55E"; // green
  const BAR_COLOR_RECALL = "#F97316"; // orange
  const GRID_COLOR = "#475569";
  const AXIS_COLOR = "#CBD5E1";

  async function loadMetrics() {
    setLoading(true);
    setError(null);
    setMetrics(null);

    try {
      const res = await fetch(`${BACKEND_URL}/baseline/metrics`);
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }
      const data = (await res.json()) as BaselineMetrics;
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Recharts data: one row per class
  const chartData =
    metrics?.per_class.map((c) => ({
      label: c.label,
      f1: c.f1,
      precision: c.precision,
      recall: c.recall,
      support: c.support,
    })) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">3. Baseline Model (TF-IDF + Naive Bayes)</h1>
      <p className="max-w-2xl text-sm text-slate-300">
        This tab summarizes the performance of the baseline model that uses
        TF-IDF features and a Multinomial Naive Bayes classifier trained on the
        complaint narratives.
      </p>

      <Button
        onClick={loadMetrics}
        disabled={loading}
        className="bg-emerald-600 hover:bg-emerald-500"
      >
        {loading ? "Loading baseline metrics…" : "Load Baseline Metrics"}
      </Button>

      {error && <p className="text-sm text-red-400">Error: {error}</p>}

      {!metrics && !loading && !error && (
        <p className="text-xs text-slate-500">
          Click &quot;Load Baseline Metrics&quot; to fetch results from the backend.
        </p>
      )}

      {metrics && (
        <div className="space-y-6">
          {/* HIGH-LEVEL CARDS */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Macro F1-score</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">
                {metrics.macro_f1.toFixed(3)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Average F1 over all classes, treating each class equally.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Accuracy</p>
              <p className="mt-1 text-2xl font-semibold text-indigo-400">
                {metrics.accuracy.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Fraction of test complaints classified correctly.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Weighted F1-score</p>
              <p className="mt-1 text-2xl font-semibold text-sky-400">
                {metrics.weighted_f1.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                F1 averaged by class frequency (dominated by big classes like
                Credit Reporting).
              </p>
            </div>
          </section>

          {/* PER-CLASS F1 / PRECISION / RECALL */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-3 text-base font-semibold">
              Per-Class Performance (Precision, Recall, F1)
            </h2>
            <p className="mb-2 text-xs text-slate-300">
              This mirrors the sklearn classification report: Credit Reporting
              is very strong, while tiny categories like Virtual currency or
              Payday loan have near-zero scores.
            </p>

            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 170, right: 16, top: 16, bottom: 16 }}
                >
                  <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} stroke={AXIS_COLOR} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={200}
                    stroke={AXIS_COLOR}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="f1" name="F1-score" fill={BAR_COLOR_F1} />
                  <Bar
                    dataKey="precision"
                    name="Precision"
                    fill={BAR_COLOR_PREC}
                  />
                  <Bar dataKey="recall" name="Recall" fill={BAR_COLOR_RECALL} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* SUPPORT TABLE (OPTIONAL) */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-2 text-base font-semibold">
              Support (Number of Complaints per Class)
            </h2>
            <p className="mb-2 text-xs text-slate-300">
              This explains why accuracy and weighted F1 look good even though
              some classes have poor F1: large classes dominate the averages.
            </p>

            <div className="max-h-64 overflow-y-auto text-xs">
              <table className="w-full text-left text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-1 pr-2">Class</th>
                    <th className="py-1 pr-2 text-right">Support</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.per_class.map((c) => (
                    <tr key={c.label} className="border-b border-slate-800">
                      <td className="py-1 pr-2">{c.label}</td>
                      <td className="py-1 text-right">{c.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}