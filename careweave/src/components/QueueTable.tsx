"use client";

import React from "react";
import { heatColor, overTarget } from "@/lib/rank";
import type { RankedDepartment } from "@/lib/types";

const TRIAGE_LABELS = ["Critical", "High", "Medium", "Low"] as const;

interface QueueTableProps {
  ranked: RankedDepartment[];
  targets: [number, number, number, number];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const EVIDENCE_STYLES: Record<string, string> = {
  strong: "border-red-400 text-red-300",
  moderate: "border-cyan-400 text-cyan-300",
  weak: "border-slate-500 text-slate-400",
  faster: "border-emerald-500 text-emerald-400",
};

export default function QueueTable({
  ranked,
  targets,
  selectedId,
  onSelect,
}: QueueTableProps) {
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-navy-700/50">
      <table className="w-full min-w-[700px] border-collapse">
        <thead>
          <tr className="border-b border-navy-700/50">
            <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-10">
              #
            </th>
            <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
              Department
            </th>
            {TRIAGE_LABELS.map((label, k) => (
              <th
                key={label}
                className="px-3 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider"
              >
                {label}
                <br />
                <span className="text-slate-500 normal-case font-normal">
                  ({targets[k]}m target)
                </span>
              </th>
            ))}
            <th className="px-3 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
              Over Target
            </th>
            <th className="px-3 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              Gap vs Peers
            </th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((row) => {
            const isSelected = row.dept.id === selectedId;
            return (
              <tr
                key={row.dept.id}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${row.dept.name}, rank ${row.rank}. Click to view details.`}
                onClick={() => onSelect(row.dept.id)}
                onKeyDown={(e) => handleKeyDown(e, row.dept.id)}
                className={`
                  border-b border-navy-700/30 cursor-pointer transition-colors duration-150
                  hover:bg-navy-700/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-inset
                  ${isSelected ? "bg-cyan-500/10 border-l-2 border-l-cyan-400" : ""}
                `}
              >
                <td className="px-3 py-3.5 text-slate-400 text-sm font-bold">
                  {row.rank}
                </td>
                <td className="px-3 py-3.5">
                  <div className="font-semibold text-white text-sm">
                    {row.dept.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.dept.service_type}
                  </div>
                </td>
                {row.dept.cells.map((cell, k) => {
                  const overPct =
                    cell.n > 0
                      ? Math.round(
                          (overTarget(row.dept.hist_10min_bins[k], targets[k]) /
                            cell.n) *
                            100
                        )
                      : 0;
                  return (
                    <td
                      key={k}
                      className="px-3 py-3.5 text-center"
                      style={{
                        background: heatColor(cell.mean, targets[k]),
                      }}
                    >
                      <span className="block font-bold text-white text-base tabular-nums">
                        {cell.mean.toFixed(0)}
                        <span className="text-xs font-normal text-slate-300 ml-0.5">
                          m
                        </span>
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {overPct}% over
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-3.5 text-right">
                  <span className="text-white font-semibold tabular-nums">
                    {row.over_total}
                  </span>
                  <span className="text-slate-500 text-xs ml-1">
                    / {row.dept.visits}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${
                      EVIDENCE_STYLES[row.evidenceClass]
                    }`}
                  >
                    {row.evidence}&nbsp;
                    {row.dept.gap_vs_peers > 0 ? "+" : ""}
                    {row.dept.gap_vs_peers.toFixed(1)} min
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
