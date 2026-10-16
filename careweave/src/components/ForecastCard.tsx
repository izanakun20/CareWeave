"use client";

import React from "react";
import type { ForecastResult, TriageLevel } from "@/lib/types";

interface ForecastCardProps {
  result: ForecastResult | null;
  loading: boolean;
  targets: [number, number, number, number];
}

const TRIAGE_ORDER: TriageLevel[] = ["Critical", "High", "Medium", "Low"];

export default function ForecastCard({ result, loading, targets }: ForecastCardProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-navy-700/50 rounded-lg" />
        <div className="h-4 bg-navy-700/50 rounded w-2/3" />
        <div className="h-4 bg-navy-700/50 rounded w-1/2" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-slate-500 text-sm italic py-4">
        Select a department and triage level to forecast.
      </div>
    );
  }

  const triageIdx = TRIAGE_ORDER.indexOf(result.triage);
  const target = targets[triageIdx] ?? 60;
  const pGePct = (result.p_ge * 100).toFixed(0);
  const rangeWidth = result.p90 - result.p10;

  return (
    <div className="space-y-5">
      {/* Main forecast */}
      <div>
        <div
          className="text-5xl font-black text-white tabular-nums"
          aria-label={`Expected wait: ${result.mean.toFixed(0)} minutes`}
        >
          {result.mean.toFixed(0)}
          <span className="text-2xl font-semibold text-slate-400 ml-1.5">min</span>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Expected wait — {result.triage} triage
        </p>
      </div>

      {/* P10–P90 range */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5">
          Likely range (10th–90th percentile)
        </p>
        <div className="flex items-center gap-2">
          <span className="text-slate-300 tabular-nums text-sm">
            {result.p10.toFixed(0)}m
          </span>
          <div className="flex-1 relative h-2 bg-navy-700 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full"
              style={{ width: "100%" }}
            />
          </div>
          <span className="text-slate-300 tabular-nums text-sm">
            {result.p90.toFixed(0)}m
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Spread of {rangeWidth.toFixed(0)} min — about 17 min of noise per visit is normal
        </p>
      </div>

      {/* P(wait >= target) */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5">
          Chance of waiting ≥ {target} min (target)
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, result.p_ge * 100)}%`,
                background:
                  result.p_ge > 0.5
                    ? "#E5484D"
                    : result.p_ge > 0.25
                    ? "#f59e0b"
                    : "#19E3F5",
              }}
              role="progressbar"
              aria-valuenow={result.p_ge * 100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pGePct}% chance of exceeding ${target} minute target`}
            />
          </div>
          <span className="text-white font-bold tabular-nums text-lg">
            {pGePct}%
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Computed from 99 residual quantiles — not a clinical prediction
        </p>
      </div>
    </div>
  );
}
