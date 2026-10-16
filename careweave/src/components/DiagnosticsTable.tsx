"use client";

import React from "react";
import type { DiagnosticsInsight } from "@/lib/types";

interface DiagnosticsTableProps {
  diagnostics: DiagnosticsInsight;
}

export default function DiagnosticsTable({ diagnostics }: DiagnosticsTableProps) {
  const testTypes = Object.entries(diagnostics.by_test_type);
  const byPriority = Object.entries(diagnostics.by_priority);
  const conflict = diagnostics.timeline_conflict;
  const maxP90 = Math.max(...testTypes.map(([, d]) => d.p90));

  return (
    <div className="space-y-5">
      {/* Timeline conflict banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-amber-400 text-lg mt-0.5" aria-hidden="true">
            ⚠
          </span>
          <div>
            <p className="font-semibold text-amber-300 text-sm">
              Timeline conflict: test times outside visit window
            </p>
            <p className="text-amber-200/70 text-xs mt-1">
              {conflict.outside_visit_window.toLocaleString()} of{" "}
              {conflict.tests.toLocaleString()} test records (
              {((conflict.outside_visit_window / conflict.tests) * 100).toFixed(1)}
              %) have request times that fall outside the linked visit. Turnaround is
              tracked on its own — tests are never placed on the patient journey.
            </p>
          </div>
        </div>
      </div>

      {/* Urgency finding */}
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-cyan-300">Note:</span> Urgent tests are
          not faster than routine ones (median{" "}
          <span className="font-mono font-bold text-white">
            {byPriority.find(([k]) => k === "Urgent")?.[1].median.toFixed(0) ?? "57"}
          </span>{" "}
          vs{" "}
          <span className="font-mono font-bold text-white">
            {byPriority.find(([k]) => k === "Routine")?.[1].median.toFixed(0) ?? "58"}
          </span>{" "}
          min). This is worth investigating with operations staff.
        </p>
      </div>

      {/* By test type */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
          Turnaround by Test Type
        </h3>
        <div className="overflow-x-auto rounded-xl border border-navy-700/50">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-navy-700/50">
                {["Test Type", "Count", "Median (min)", "P90 (min)", "Over 120 min"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {testTypes.map(([type, d]) => (
                <tr
                  key={type}
                  className="border-b border-navy-700/20 hover:bg-navy-700/20 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white text-sm">{type}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm tabular-nums">
                    {d.n.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm tabular-nums">
                    {d.median.toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-slate-300">{d.p90.toFixed(0)}</span>
                      <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${(d.p90 / maxP90) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
                    {(d.share_over_120 * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By priority */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
          Turnaround by Priority
        </h3>
        <div className="overflow-x-auto rounded-xl border border-navy-700/50">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-navy-700/50">
                {["Priority", "Count", "Median (min)", "P90 (min)", "Over 120 min"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byPriority.map(([priority, d]) => (
                <tr
                  key={priority}
                  className="border-b border-navy-700/20 hover:bg-navy-700/20 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white text-sm">{priority}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm tabular-nums">
                    {d.n.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm tabular-nums">
                    {d.median.toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm tabular-nums">
                    {d.p90.toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
                    {(d.share_over_120 * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
