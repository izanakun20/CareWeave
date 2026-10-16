"use client";

import React from "react";

interface TargetSlidersProps {
  targets: [number, number, number, number];
  onChange: (targets: [number, number, number, number]) => void;
}

const TRIAGE_LABELS = ["Critical", "High", "Medium", "Low"] as const;
const TRIAGE_COLORS = ["#E5484D", "#f59e0b", "#19E3F5", "#34d399"] as const;

export default function TargetSliders({ targets, onChange }: TargetSlidersProps) {
  const handleChange = (index: number, value: number) => {
    const next = [...targets] as [number, number, number, number];
    next[index] = value;
    onChange(next);
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {TRIAGE_LABELS.map((label, k) => (
        <div key={label} className="flex flex-col gap-2">
          <label
            htmlFor={`target-slider-${k}`}
            className="text-sm font-semibold text-slate-300 flex items-center gap-2"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: TRIAGE_COLORS[k] }}
              aria-hidden="true"
            />
            {label}
          </label>
          <div className="flex items-center gap-3">
            <input
              id={`target-slider-${k}`}
              type="range"
              min={10}
              max={120}
              step={10}
              value={targets[k]}
              onChange={(e) => handleChange(k, Number(e.target.value))}
              className="flex-1 accent-cyan-400 h-1.5 rounded cursor-pointer"
              aria-label={`${label} wait target in minutes`}
              aria-valuetext={`${targets[k]} minutes`}
            />
            <output
              htmlFor={`target-slider-${k}`}
              className="text-sm font-bold text-white min-w-[3.5rem] text-right tabular-nums"
            >
              {targets[k]} min
            </output>
          </div>
          <p className="text-xs text-slate-500">Hospital-set target</p>
        </div>
      ))}
    </div>
  );
}
