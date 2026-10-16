"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ForecastCard from "@/components/ForecastCard";
import { predict } from "@/lib/predict";
import modelData from "@/data/model.json";
import insightsData from "@/data/insights.json";
import type { ModelJSON, InsightsJSON, TriageLevel, ForecastResult } from "@/lib/types";

const model = modelData as ModelJSON;
const insights = insightsData as InsightsJSON;

const TRIAGE_LABELS: TriageLevel[] = ["Critical", "High", "Medium", "Low"];
const DEFAULT_TARGETS: [number, number, number, number] = [20, 40, 60, 90];

function ForecastPageInner() {
  const searchParams = useSearchParams();
  const initialDept = searchParams.get("dept") ?? insights.departments[0].id;

  const [selectedDept, setSelectedDept] = useState(initialDept);
  const [selectedTriage, setSelectedTriage] = useState<TriageLevel>("Medium");
  const [threshold, setThreshold] = useState(60);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Forecast for all departments at same triage
  const [crossDept, setCrossDept] = useState<ForecastResult[]>([]);

  useEffect(() => {
    setLoading(true);
    // Client-side inference — no network call
    const r = predict(model, selectedDept, selectedTriage, threshold);
    setResult(r);

    const cross = insights.departments.map((d) =>
      predict(model, d.id, selectedTriage, threshold)
    );
    setCrossDept(cross);
    setLoading(false);
  }, [selectedDept, selectedTriage, threshold]);

  const maxCrossMean = Math.max(...crossDept.map((r) => r.mean));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Forecast Wait Time
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Expected wait and confidence range for a patient entering any department.
          Only department and triage level are predictive.
        </p>
      </div>

      {/* Controls */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">Forecast Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Department */}
          <div>
            <label
              htmlFor="forecast-dept"
              className="block text-xs text-slate-400 uppercase tracking-wider mb-2"
            >
              Department
            </label>
            <select
              id="forecast-dept"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-[#0B1F3A] border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19E3F5]"
            >
              {insights.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Triage level */}
          <div>
            <p className="block text-xs text-slate-400 uppercase tracking-wider mb-2">
              Triage Level
            </p>
            <div className="flex gap-2" role="group" aria-label="Triage level selection">
              {TRIAGE_LABELS.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTriage(t)}
                  aria-pressed={selectedTriage === t}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19E3F5] ${
                    selectedTriage === t
                      ? "bg-[#19E3F5]/20 border-[#19E3F5]/50 text-[#19E3F5]"
                      : "border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Threshold */}
          <div>
            <label
              htmlFor="forecast-threshold"
              className="block text-xs text-slate-400 uppercase tracking-wider mb-2"
            >
              P(wait ≥) threshold — {threshold} min
            </label>
            <input
              id="forecast-threshold"
              type="range"
              min={10}
              max={120}
              step={10}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-1.5 cursor-pointer"
            />
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-4">
          Note: hour of day, weekday, month, age, sex, and insurance were tested and showed
          no usable predictive signal — see the Model page. Only department + triage level matter.
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Forecast result */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-5">
            Forecast:{" "}
            {insights.departments.find((d) => d.id === selectedDept)?.name} /{" "}
            {selectedTriage}
          </h2>
          <ForecastCard result={result} loading={loading} targets={DEFAULT_TARGETS} />
        </section>

        {/* Cross-department bars */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-1">
            {selectedTriage} triage across all departments
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Department effect is visible — same triage, different waits.
          </p>
          <div className="space-y-2.5">
            {crossDept
              .map((r, i) => ({ r, dept: insights.departments[i] }))
              .sort((a, b) => b.r.mean - a.r.mean)
              .map(({ r, dept }) => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.id)}
                  className={`w-full text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19E3F5] rounded-lg transition-colors ${
                    dept.id === selectedDept ? "opacity-100" : "opacity-70 hover:opacity-90"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-300 w-28 truncate">
                      {dept.name}
                    </span>
                    <span className="text-xs font-bold text-white tabular-nums">
                      {r.mean.toFixed(0)}m
                    </span>
                  </div>
                  <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(r.mean / maxCrossMean) * 100}%`,
                        background:
                          dept.id === selectedDept ? "#19E3F5" : "#1e3a5f",
                      }}
                    />
                  </div>
                </button>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ForecastPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">Loading forecast...</div>}>
      <ForecastPageInner />
    </Suspense>
  );
}
