import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ControlChart from "@/components/ControlChart";
import insightsData from "@/data/insights.json";
import type { InsightsJSON } from "@/lib/types";
import { overTarget } from "@/lib/rank";

const insights = insightsData as InsightsJSON;
const TRIAGE_LABELS = ["Critical", "High", "Medium", "Low"] as const;

export async function generateStaticParams() {
  return insights.departments.map((d) => ({ id: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const dept = insights.departments.find((d) => d.id === id);
  if (!dept) return { title: "Department Not Found" };
  return {
    title: `${dept.name} — Department Detail`,
    description: `Why ${dept.name} ranks where it does: triage mix, department effect, capacity, and weekly trend.`,
  };
}

const DEFAULT_TARGETS: [number, number, number, number] = [20, 40, 60, 90];

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dept = insights.departments.find((d) => d.id === id);
  if (!dept) notFound();

  const mu = insights.overall.mean_wait;
  const caps = insights.departments.map((d) => d.daily_capacity).sort((a, b) => a - b);
  const mid = Math.floor(caps.length / 2);
  const medianCap =
    caps.length % 2 === 0 ? (caps[mid - 1] + caps[mid]) / 2 : caps[mid];
  const weeksOutside = dept.weekly_z.filter((z) => Math.abs(z) > 3).length;

  // Worst triage
  const worstIdx = dept.cells
    .map((c, k) => ({ ratio: c.mean / DEFAULT_TARGETS[k], k }))
    .sort((a, b) => b.ratio - a.ratio)[0];

  const signals = [
    dept.gap_vs_peers > 0
      ? `Patients wait <strong>${dept.gap_vs_peers.toFixed(1)} min longer</strong> than in other departments at the same triage level (z = ${dept.gap_z.toFixed(1)}). A gap this large over ${dept.visits} visits is not noise.`
      : `Patients wait <strong>${Math.abs(dept.gap_vs_peers).toFixed(1)} min less</strong> than in other departments at the same triage level. Any over-target count here comes from visit volume or target settings, not a department-specific problem.`,

    `Worst fit to target: <strong>${TRIAGE_LABELS[worstIdx.k]}</strong> patients average ${dept.cells[worstIdx.k].mean.toFixed(0)} min against a ${DEFAULT_TARGETS[worstIdx.k]}-min target, with ${((overTarget(dept.hist_10min_bins[worstIdx.k], DEFAULT_TARGETS[worstIdx.k]) / dept.cells[worstIdx.k].n) * 100).toFixed(0)}% over.`,

    dept.daily_capacity < medianCap
      ? `Daily capacity is <strong>${dept.daily_capacity}</strong>, below the hospital median of ${medianCap}. Across the 12 departments, lower capacity is associated with longer waits (correlation r ≈ −0.60).`
      : `Daily capacity is <strong>${dept.daily_capacity}</strong>, at or above the hospital median of ${medianCap}.`,

    weeksOutside > 0
      ? `<strong>${weeksOutside}</strong> of 52 weeks sit outside the 3-sigma control limit. Check those weeks first — they may indicate a temporary disruption.`
      : `<strong>No week</strong> sits outside the 3-sigma limit, so the delay is steady and structural, not a one-off spike.`,
  ];

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300 transition-colors">
          Command Center
        </Link>
        <span className="mx-2">›</span>
        <span className="text-slate-300">{dept.name}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          {dept.name}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          {dept.service_type} service · {dept.staff} staff · {dept.beds} beds ·{" "}
          {dept.daily_capacity} daily capacity · {dept.visits} visits in 2025
        </p>
      </div>

      {/* Decomposition */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">
          Wait Decomposition
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Each department&apos;s mean wait = hospital average + triage mix effect + department-specific gap.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <DecompBox label="Hospital average" value={`${mu.toFixed(1)} min`} color="text-slate-200" />
          <span className="text-slate-500 text-lg">+</span>
          <DecompBox
            label="Triage mix effect"
            value={`${dept.triage_mix_effect >= 0 ? "+" : ""}${dept.triage_mix_effect.toFixed(1)} min`}
            color="text-slate-300"
            note="Higher/lower than avg mix"
          />
          <span className="text-slate-500 text-lg">+</span>
          <DecompBox
            label="Department effect"
            value={`${dept.gap_vs_peers >= 0 ? "+" : ""}${dept.gap_vs_peers.toFixed(1)} min`}
            color={dept.gap_vs_peers > 0 ? "text-[#E5484D]" : "text-emerald-400"}
            note={`z = ${dept.gap_z.toFixed(1)}`}
          />
          <span className="text-slate-500 text-lg">=</span>
          <DecompBox
            label="Department mean"
            value={`${dept.mean_wait.toFixed(1)} min`}
            color="text-white"
            strong
          />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Signals */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">Signals</h2>
          <ul className="space-y-4">
            {signals.map((text, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
                <span className="mt-1.5 flex-shrink-0 text-[#19E3F5] font-bold">
                  {i + 1}.
                </span>
                <span dangerouslySetInnerHTML={{ __html: text }} />
              </li>
            ))}
          </ul>
        </section>

        {/* Control chart */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">
            Weekly Wait vs Expected (z-score)
          </h2>
          <ControlChart weeklyZ={dept.weekly_z} departmentName={dept.name} />
        </section>
      </div>

      {/* Triage cells table */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">
          Wait Distribution by Triage Level
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10">
                {["Triage", "Visits", "Mean (min)", "P10", "P50", "P90"].map((h) => (
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
              {dept.cells.map((cell, k) => {
                const target = DEFAULT_TARGETS[k];
                const over = overTarget(dept.hist_10min_bins[k], target);
                return (
                  <tr
                    key={cell.triage}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white text-sm">
                      {cell.triage}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm tabular-nums">
                      {cell.n}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`font-bold tabular-nums ${
                          cell.mean > target ? "text-[#E5484D]" : "text-white"
                        }`}
                      >
                        {cell.mean.toFixed(1)}
                      </span>
                      <span className="text-slate-500 text-xs ml-1">
                        / {target}m target
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm tabular-nums">
                      {cell.p10}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm tabular-nums">
                      {cell.p50}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm tabular-nums">
                      {cell.p90}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Navigation links */}
      <div className="flex flex-wrap gap-4">
        <Link
          href={`/forecast?dept=${dept.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#19E3F5]/10 border border-[#19E3F5]/30 text-[#19E3F5] rounded-xl text-sm hover:bg-[#19E3F5]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19E3F5]"
        >
          Forecast a patient in {dept.name} →
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19E3F5]"
        >
          ← Back to Command Center
        </Link>
      </div>
    </div>
  );
}

function DecompBox({
  label,
  value,
  color,
  note,
  strong,
}: {
  label: string;
  value: string;
  color: string;
  note?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`bg-[#0B1F3A] border border-white/10 rounded-xl px-4 py-3 text-center ${
        strong ? "border-white/20" : ""
      }`}
    >
      <div className={`text-base font-black tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {note && <div className="text-xs text-slate-600 mt-0.5">{note}</div>}
    </div>
  );
}
