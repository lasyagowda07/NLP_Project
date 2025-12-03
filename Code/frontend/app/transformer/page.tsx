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
  Cell, // 👈 for per-bar colors
} from "recharts";

const BACKEND_URL = "http://localhost:8000";

type DistilbertTrainingInfo = {
  num_labels: number;
  train_samples: number;
  val_samples: number;
  epochs: number;
  batch_size: number;
  learning_rate: number;
  warmup_steps: number;
  weight_decay: number;
  bf16: boolean;
  total_steps_approx: number;
  training_minutes: number;
  peak_gpu_gb: number;
  gpu_name: string;
};

type DistilbertMetrics = {
  accuracy: number;
  macro_f1: number;
  training: DistilbertTrainingInfo;
};

export default function TransformerPage() {
  const [metrics, setMetrics] = useState<DistilbertMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMetrics() {
    setLoading(true);
    setError(null);
    setMetrics(null);

    try {
      const res = await fetch(`${BACKEND_URL}/transformer/metrics`);
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }
      const json = (await res.json()) as DistilbertMetrics;
      setMetrics(json);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // chart data for accuracy vs macro F1
  const chartData =
    metrics !== null
      ? [
          { metric: "Accuracy", value: metrics.accuracy },
          { metric: "Macro F1", value: metrics.macro_f1 },
        ]
      : [];

  // 🎨 colors (dark-mode friendly)
  const BAR_COLOR_ACC = "#22C55E"; // green-500
  const BAR_COLOR_F1 = "#8B5CF6"; // violet-500
  const GRID_COLOR = "#94A3B8";   // slate-400
  const AXIS_COLOR = "#E2E8F0";   // slate-200

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        4. Fine-tuned DistilBERT (Transformer)
      </h1>
      <p className="max-w-2xl text-sm text-slate-300">
        This tab shows the performance and training configuration of the
        fine-tuned DistilBERT model we used to classify CFPB complaint
        narratives into product categories.
      </p>

      <Button
        onClick={loadMetrics}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-500"
      >
        {loading ? "Loading DistilBERT metrics…" : "Load DistilBERT Metrics"}
      </Button>

      {error && <p className="text-sm text-red-400">Error: {error}</p>}

      {!metrics && !loading && !error && (
        <p className="text-xs text-slate-500">
          Click &quot;Load DistilBERT Metrics&quot; to fetch results from the
          backend.
        </p>
      )}

      {metrics && (
        <div className="space-y-8">
          {/* SUMMARY CARDS */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-300">Validation accuracy</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">
                {(metrics.accuracy * 100).toFixed(2)}%
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Fraction of complaints classified correctly on the validation
                set.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-300">Macro F1-score</p>
              <p className="mt-1 text-2xl font-semibold text-indigo-300">
                {metrics.macro_f1.toFixed(3)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Average F1 over all product classes, treating each class
                equally. This is important because the dataset is highly
                imbalanced.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-300">Training dataset</p>
              <p className="mt-1 text-xl font-semibold text-sky-400">
                {metrics.training.train_samples.toLocaleString()} train /{" "}
                {metrics.training.val_samples.toLocaleString()} val
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {metrics.training.num_labels} product labels after cleaning and
                merging categories.
              </p>
            </div>
          </section>

          {/* METRIC BAR CHART */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-2 text-base font-semibold">
              DistilBERT Performance Metrics
            </h2>
            <p className="mb-3 text-xs text-slate-300">
              Accuracy tells us how often the model is correct overall. Macro
              F1 shows how well it does across all product categories,
              including the rare ones.
            </p>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                  <XAxis dataKey="metric" stroke={AXIS_COLOR} />
                  <YAxis
                    stroke={AXIS_COLOR}
                    domain={[0, 1]}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ color: "#E2E8F0" }}
                    itemStyle={{ color: "#F8FAFC" }}
                  />
                  <Bar dataKey="value" name="Score" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.metric}
                        fill={
                          entry.metric === "Accuracy"
                            ? BAR_COLOR_ACC
                            : BAR_COLOR_F1
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* TRAINING CONFIG */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-2 text-base font-semibold">
              Training Configuration (A100 GPU)
            </h2>
            <p className="mb-3 text-xs text-slate-300">
              These settings come directly from the fine-tuning notebook (Google
              Colab with NVIDIA A100).
            </p>

            <div className="grid gap-4 md:grid-cols-2 text-xs text-slate-300">
              <div>
                <p>
                  <span className="text-slate-400">GPU:&nbsp;</span>
                  <span className="font-medium">
                    {metrics.training.gpu_name}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400">Peak GPU memory:&nbsp;</span>
                  {metrics.training.peak_gpu_gb.toFixed(2)} GB
                </p>
                <p>
                  <span className="text-slate-400">Training time:&nbsp;</span>
                  {metrics.training.training_minutes.toFixed(1)} minutes
                </p>
                <p>
                  <span className="text-slate-400">Epochs:&nbsp;</span>
                  {metrics.training.epochs}
                </p>
                <p>
                  <span className="text-slate-400">Batch size:&nbsp;</span>
                  {metrics.training.batch_size}
                </p>
              </div>

              <div>
                <p>
                  <span className="text-slate-400">
                    Learning rate:&nbsp;
                  </span>
                  {metrics.training.learning_rate}
                </p>
                <p>
                  <span className="text-slate-400">Warmup steps:&nbsp;</span>
                  {metrics.training.warmup_steps}
                </p>
                <p>
                  <span className="text-slate-400">Weight decay:&nbsp;</span>
                  {metrics.training.weight_decay}
                </p>
                <p>
                  <span className="text-slate-400">
                    bfloat16 enabled:&nbsp;
                  </span>
                  {metrics.training.bf16 ? "Yes" : "No"}
                </p>
                <p>
                  <span className="text-slate-400">
                    Approx. total steps:&nbsp;
                  </span>
                  {metrics.training.total_steps_approx.toLocaleString()}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}