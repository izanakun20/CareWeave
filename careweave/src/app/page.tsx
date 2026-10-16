"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import TargetSliders from "@/components/TargetSliders";
import QueueTable from "@/components/QueueTable";
import { rankDepartments } from "@/lib/rank";
import insightsData from "@/data/insights.json";
import type { InsightsJSON, RankedDepartment } from "@/lib/types";

const insights = insightsData as InsightsJSON;
const DEFAULT_TARGETS: [number, number, number, number] = [20, 40, 60, 90];

export default function CommandCenterPage() {
  const [targets, setTargets] = useState<[number, number, number, number]>(DEFAULT_TARGETS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ranked: RankedDepartment[] = useMemo(
    () => rankDepartments(insights.departments, targets),
    [targets]
  );

  // Auto-select top department on initial load
  const effectiveSelectedId = selectedId ?? ranked[0]?.dept.id ?? null;

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const { overall } = insights;
  const totalVisits = overall.visits;
  const meanWait = overall.mean_wait;
  const topDept = ranked[0];

  // Compute overall share over target across all departments
  const totalOverTarget = ranked.reduce((sum, r) => sum + r.over_total, 0);
  const shareOverTarget = totalVisits > 0 ? (totalOverTarget / totalVisits) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Command Center
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Which departments make patients wait longest, and what should operations examine first?
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Total Visits"
          value={totalVisits.toLocaleString()}
          unit=""
          detail="Jan–Dec 2025"
        />
        <KpiCard
          label="Mean Wait"
          value={meanWait.toFixed(1)}
          unit="min"
          detail="Across all triage levels"
        />
        <KpiCard
          label="Over Target"
          value={shareOverTarget.toFixed(1)}
          unit="%"
          detail="At current target settings"
          highlight={shareOverTarget > 30}
        />
        <KpiCard
          label="Investigate First"
          value={topDept?.dept.name ?? "—"}
          unit=""
          detail={
            topDept
              ? `Gap: +${topDept.dept.gap_vs_peers.toFixed(1)} min vs peers`
              : ""
          }
          highlight={true}
          isLink={topDept ? `/departments/${topDept.dept.id}` : undefined}
        />
      </div>

      {/* Target sliders */}
      <section
        className="bg-white/5 border border-white/10 rounded-2xl p-6"
        aria-label="Wait time targets"
      >
        <h2 className="text-base font-bold text-white mb-4">
          1. Set Your Wait Targets
        </h2>
        <TargetSliders targets={targets} onChange={setTargets} />
        <p className="text-xs text-slate-500 mt-4">
          Targets are placeholders hospitals set themselves. Moving a slider re-ranks
          the table instantly without a page reload.
        </p>
      </section>

      {/* Queue table */}
      <section aria-label="Department ranking — investigate first">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">
            2. Investigate First
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">
            Ranked by patients over target · weighted by gap evidence · select a row for details
          </p>
        </div>
        <QueueTable
          ranked={ranked}
          targets={targets}
          selectedId={effectiveSelectedId}
          onSelect={handleSelect}
        />
      </section>

      {/* Department detail inline (if selected) */}
      {effectiveSelectedId && (
        <DeptDetailInline
          deptId={effectiveSelectedId}
          targets={targets}
          ranked={ranked}
        />
      )}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  unit,
  detail,
  highlight,
  isLink,
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
  highlight?: boolean;
  isLink?: string;
}) {
  const inner = (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-[#19E3F5]/30 bg-[#19E3F5]/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black text-white tabular-nums">{value}</span>
        {unit && <span className="text-slate-400 text-sm">{unit}</span>}
      </div>
      <p className="text-xs text-slate-500 mt-1.5">{detail}</p>
    </div>
  );

  if (isLink) {
    return (
      <Link
        href={isLink}
        className="block hover:scale-[1.02] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19E3F5] rounded-2xl"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─── Inline department detail ────────────────────────────────────────────────
import ControlChart from "@/components/ControlChart";
import { overTarget } from "@/lib/rank";

const TRIAGE_LABELS = ["Critical", "High", "Medium", "Low"] as const;

function DeptDetailInline({
  deptId,
  targets,
  ranked,
}: {
  deptId: string;
  targets: [number, number, number, number];
  ranked: RankedDepartment[];
}) {
  const dept = insights.departments.find((d) => d.id === deptId);
  const rankedDept = ranked.find((r) => r.dept.id === deptId);
  if (!dept || !rankedDept) return null;

  const mu = overall_mean(insights);
  const medianCap = median_capacity(insights);
  const weeksOutside = dept.weekly_z.filter((z) => Math.abs(z) > 3).length;

  // Worst triage group vs target
  const worstIdx = dept.cells
    .map((c, k) => ({ ratio: c.mean / targets[k], k }))
    .sort((a, b) => b.ratio - a.ratio)[0];

  const signals: { text: string; strong?: boolean }[] = [
    {
      text:
        dept.gap_vs_peers > 0
          ? `Patients wait ${dept.gap_vs_peers.toFixed(1)} min longer than other departments at the same triage level (z = ${dept.gap_z.toFixed(1)}). Over ${dept.visits} visits, this gap is not noise.`
          : `Patients wait ${Math.abs(dept.gap_vs_peers).toFixed(1)} min less than peers at the same triage level. Any over-target count here comes from volume or targets, not a department-specific problem.`,
      strong: dept.gap_vs_peers > 0,
    },
    {
      text: `Worst fit to target: ${TRIAGE_LABELS[worstIdx.k]} patients average ${dept.cells[worstIdx.k].mean.toFixed(0)} min against a ${targets[worstIdx.k]}-min target (${((overTarget(dept.hist_10min_bins[worstIdx.k], targets[worstIdx.k]) / dept.cells[worstIdx.k].n) * 100).toFixed(0)}% over).`,
    },
    {
      text:
        dept.daily_capacity < medianCap
          ? `Daily capacity is ${dept.daily_capacity}, below the hospital median of ${medianCap}. Across 12 departments, lower capacity correlates with longer waits.`
          : `Daily capacity is ${dept.daily_capacity}, at or above the hospital median of ${medianCap}.`,
    },
    {
      text:
        weeksOutside > 0
          ? `${weeksOutside} of 52 weeks sit outside the 3-sigma limit. Check those weeks first.`
          : `No week sits outside the 3-sigma limit — the delay is steady and structural, not a one-off spike.`,
    },
  ];

  return (
    <section
      id="dept-detail"
      className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6"
      aria-label={`Detail for ${dept.name}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">
            3. Why {dept.name} is ranked #{rankedDept.rank}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {dept.service_type} · {dept.staff} staff · {dept.beds} beds · {dept.visits} visits
          </p>
        </div>
        <Link
          href={`/departments/${dept.id}`}
          className="text-[#19E3F5] text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19E3F5] rounded"
        >
          Full detail →
        </Link>
      </div>

      {/* Decomposition equation */}
      <div className="bg-[#0B1F3A] rounded-xl p-4 border border-white/10">
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">
          Wait decomposition
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <DecompPart label="Hospital avg" value={`${mu.toFixed(1)} min`} />
          <span className="text-slate-500">+</span>
          <DecompPart
            label="Triage mix"
            value={`${dept.triage_mix_effect >= 0 ? "+" : ""}${dept.triage_mix_effect.toFixed(1)} min`}
          />
          <span className="text-slate-500">+</span>
          <DecompPart
            label="Dept effect"
            value={`${dept.gap_vs_peers >= 0 ? "+" : ""}${dept.gap_vs_peers.toFixed(1)} min`}
            accent
          />
          <span className="text-slate-500">=</span>
          <DecompPart
            label="Dept mean"
            value={`${dept.mean_wait.toFixed(1)} min`}
            strong
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Signals */}
        <div>
          <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
            Evidence
          </h3>
          <ul className="space-y-2.5">
            {signals.map((s, i) => (
              <li
                key={i}
                className="text-sm text-slate-300 leading-relaxed flex gap-2"
              >
                <span
                  className={`mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                    s.strong ? "bg-[#E5484D]" : "bg-[#19E3F5]"
                  }`}
                />
                <span
                  dangerouslySetInnerHTML={{ __html: s.text.replace(/(\d+\.?\d*) min/g, "<strong>$& </strong>") }}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Control chart */}
        <div>
          <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
            Weekly Wait vs Expected (z-score)
          </h3>
          <ControlChart weeklyZ={dept.weekly_z} departmentName={dept.name} />
        </div>
      </div>
    </section>
  );
}

function DecompPart({
  label,
  value,
  accent,
  strong,
}: {
  label: string;
  value: string;
  accent?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`font-bold tabular-nums ${
          strong ? "text-white text-base" : accent ? "text-[#19E3F5]" : "text-slate-300"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function overall_mean(insights: InsightsJSON): number {
  return insights.overall.mean_wait;
}

function median_capacity(insights: InsightsJSON): number {
  const caps = insights.departments.map((d) => d.daily_capacity).sort((a, b) => a - b);
  const mid = Math.floor(caps.length / 2);
  return caps.length % 2 === 0 ? (caps[mid - 1] + caps[mid]) / 2 : caps[mid];
}
