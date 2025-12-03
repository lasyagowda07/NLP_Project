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
  LineChart,
  Line,
} from "recharts";

const BACKEND_URL = "http://localhost:8000";

type EdaPlots = {
  product_counts: Record<string, number>;
  top_states: Record<string, number>;
  submitted_via_counts: Record<string, number>;
  monthly_complaints: { date: string; count: number }[];
  narrative_hist: { bin_start: number; bin_end: number; count: number }[];
  word_count_stats: Record<string, number>;
};

export default function EdaPage() {
  const [data, setData] = useState<EdaPlots | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEda() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`${BACKEND_URL}/eda/plots`);
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }
      const json = (await res.json()) as EdaPlots;
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function dictToArray(obj: Record<string, number>, key: string, value: string) {
    return Object.entries(obj).map(([k, v]) => ({
      [key]: k,
      [value]: v,
    }));
  }

  // 🎨 Chart colors
  const BAR_COLOR = "#4F46E5"; // Indigo-600
  const LINE_COLOR = "#22D3EE"; // Cyan-400
  const GRID_COLOR = "#94A3B8";
  const AXIS_COLOR = "#E2E8F0";

  // ---- Derived summary metrics (for the cards) ----
  let productArray: { product: string; count: number }[] = [];
  let totalComplaints = 0;
  let numProducts = 0;
  let topProductName = "";
  let topProductPct = 0;
  let webSharePct = 0;
  let medianWords = 0;

  if (data) {
    productArray = dictToArray(
      data.product_counts,
      "product",
      "count"
    ) as { product: string; count: number }[];

    // sort just to be safe
    productArray.sort((a, b) => b.count - a.count);

    totalComplaints = productArray.reduce((acc, cur) => acc + cur.count, 0);
    numProducts = productArray.length;

    if (productArray.length > 0 && totalComplaints > 0) {
      topProductName = productArray[0].product;
      topProductPct = (productArray[0].count / totalComplaints) * 100;
    }

    const submittedArray = dictToArray(
      data.submitted_via_counts,
      "channel",
      "count"
    ) as { channel: string; count: number }[];

    const totalSubmissions = submittedArray.reduce(
      (acc, cur) => acc + cur.count,
      0
    );
    const webCount =
      submittedArray.find((x) => x.channel.toLowerCase().includes("web"))
        ?.count ?? 0;

    if (totalSubmissions > 0) {
      webSharePct = (webCount / totalSubmissions) * 100;
    }

    medianWords = data.word_count_stats["p50"] ?? 0;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">2. Exploratory Data Analysis (EDA)</h1>
      <p className="max-w-2xl text-sm text-slate-300">
        This tab summarizes the complaint dataset: which products and states
        drive most complaints, how people submit complaints, monthly trends,
        and how long the narratives typically are.
      </p>

      <Button
        onClick={loadEda}
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-500"
      >
        {loading ? "Running EDA…" : "Run EDA"}
      </Button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!data && !loading && !error && (
        <p className="text-xs text-slate-500">
          Click “Run EDA” to load visualizations from the backend.
        </p>
      )}

      {data && (
        <div className="space-y-8">
          {/* SUMMARY CARDS */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-200">Dataset size</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">
                {totalComplaints.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-200">
                complaints across <b>{numProducts}</b> product categories
                (first 100k rows).
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-200">Dominant product</p>
              <p className="mt-1 text-sm font-semibold text-indigo-300">
                {topProductName || "-"}
              </p>
              <p className="mt-1 text-xl font-semibold text-indigo-400">
                {topProductPct.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-slate-200">
                of all complaints fall into this product.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-200">How people complain</p>
              <p className="mt-1 text-xl font-semibold text-sky-400">
                {webSharePct.toFixed(1)}% via Web
              </p>
              <p className="mt-1 text-xs text-slate-200">
                Median narrative length is{" "}
                <b>{Math.round(medianWords).toLocaleString()}</b> words.
              </p>
            </div>
          </section>

          {/* PRODUCT IMBALANCE */}
          <section className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <h2 className="text-base font-semibold mb-3">
              Complaint Volume by Product (Class Imbalance)
            </h2>
            <p className="mb-2 text-xs text-slate-300">
              Most complaints are concentrated in a few credit-reporting
              categories, which makes the classification problem highly
              imbalanced.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productArray.slice(0, 15)}
                  layout="vertical"
                  margin={{ left: 150, right: 20, top: 20, bottom: 20 }}
                >
                  <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                  <XAxis type="number" stroke={AXIS_COLOR} />
                  <YAxis
                    dataKey="product"
                    type="category"
                    width={200}
                    stroke={AXIS_COLOR}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill={BAR_COLOR} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* STATES */}
          <section className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <h2 className="text-base font-semibold mb-3">
              Top 10 States by Complaint Volume
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dictToArray(data.top_states, "state", "count")}>
                  <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                  <XAxis dataKey="state" stroke={AXIS_COLOR} />
                  <YAxis stroke={AXIS_COLOR} />
                  <Tooltip />
                  <Bar dataKey="count" fill={BAR_COLOR} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* SUBMISSION CHANNELS */}
          <section className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <h2 className="text-base font-semibold mb-3">
              Complaints by Submission Channel
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dictToArray(
                    data.submitted_via_counts,
                    "channel",
                    "count"
                  )}
                >
                  <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                  <XAxis dataKey="channel" stroke={AXIS_COLOR} angle={-20} />
                  <YAxis stroke={AXIS_COLOR} />
                  <Tooltip />
                  <Bar dataKey="count" fill={BAR_COLOR} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* MONTHLY TREND */}
          <section className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <h2 className="text-base font-semibold mb-3">
              Monthly Complaint Volume Over Time
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthly_complaints}>
                  <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke={AXIS_COLOR} />
                  <YAxis stroke={AXIS_COLOR} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={LINE_COLOR}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* NARRATIVE HISTOGRAM + SUMMARY */}
          <section className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <h2 className="text-base font-semibold mb-3">
              Narrative Length Distribution (Characters)
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.narrative_hist}>
                  <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                  <XAxis dataKey="bin_start" stroke={AXIS_COLOR} />
                  <YAxis stroke={AXIS_COLOR} />
                  <Tooltip />
                  <Bar dataKey="count" fill={BAR_COLOR} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h3 className="mt-3 text-sm font-semibold text-slate-200">
              Word Count Summary
            </h3>
            <table className="text-xs w-full text-slate-300 mt-2">
              <tbody>
                {Object.entries(data.word_count_stats).map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-800">
                    <td className="py-1 capitalize text-slate-200">{k}</td>
                    <td className="py-1 text-right">{v.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}