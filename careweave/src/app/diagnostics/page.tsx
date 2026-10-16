import type { Metadata } from "next";
import DiagnosticsTable from "@/components/DiagnosticsTable";
import insightsData from "@/data/insights.json";
import type { InsightsJSON } from "@/lib/types";

export const metadata: Metadata = {
  title: "Diagnostics Monitor",
  description:
    "Test turnaround times by type and priority. Timeline conflict banner explains why tests are tracked separately from the patient journey.",
};

const insights = insightsData as InsightsJSON;

export default function DiagnosticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Diagnostics Monitor
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Test turnaround from request to completion. Tracked independently from
          patient waits due to a timeline conflict in the data.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <DiagnosticsTable diagnostics={insights.diagnostics} />
      </div>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-3">Data Quality Notes</h2>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="text-[#19E3F5] mt-0.5">•</span>
            <span>
              <strong className="text-white">
                {insights.diagnostics.timeline_conflict.outside_visit_window.toLocaleString()}
              </strong>{" "}
              of{" "}
              <strong className="text-white">
                {insights.diagnostics.timeline_conflict.tests.toLocaleString()}
              </strong>{" "}
              test records have request times outside their linked visit window.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#19E3F5] mt-0.5">•</span>
            <span>
              {insights.diagnostics.timeline_conflict.note}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#19E3F5] mt-0.5">•</span>
            <span>
              Patients without linked visits:{" "}
              <strong className="text-white">
                {insights.data_quality.patients_without_visits}
              </strong>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#19E3F5] mt-0.5">•</span>
            <span>
              Chronic condition field missing:{" "}
              <strong className="text-white">
                {insights.data_quality.chronic_condition_missing_pct}%
              </strong>{" "}
              of patients
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
