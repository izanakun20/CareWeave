import type { Metadata } from "next";
import modelData from "@/data/model.json";
import insightsData from "@/data/insights.json";
import type { ModelJSON, InsightsJSON } from "@/lib/types";

export const metadata: Metadata = {
  title: "How CareWeave Thinks",
  description:
    "Model evaluation: MAE comparison, feature ablation, interval coverage, calibration, and alert backtest.",
};

const model = modelData as ModelJSON;
const insights = insightsData as InsightsJSON;

const MAE_LABELS: Record<string, string> = {
  train_average: "Predict training average (baseline)",
  triage_only: "Triage level only",
  department_triage_cell_mean: "Department + triage lookup",
  ols_additive: "Additive model we trained (chosen)",
  gradient_boosting_all_features: "Gradient boosting, all features",
};

export default function ModelPage() {
  const eval_ = model.evaluation;
  const maeEntries = Object.entries(eval_.mae) as [string, number][];
  const maxMae = Math.max(...maeEntries.map(([, v]) => v));
  const baseline = eval_.mae.train_average;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          How CareWeave Thinks
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Model methodology, evaluation results, and what the data could and
          could not tell us.
        </p>
      </div>

      {/* Time split */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-3">Time-Aware Train / Test Split</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-[#0B1F3A] rounded-xl p-4 border border-white/10">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Train</p>
            <p className="text-white font-semibold">{eval_.split.train}</p>
            <p className="text-slate-400 mt-1">{eval_.split.n_train.toLocaleString()} visits</p>
          </div>
          <div className="bg-[#0B1F3A] rounded-xl p-4 border border-[#19E3F5]/20">
            <p className="text-xs text-[#19E3F5] uppercase tracking-wider mb-1">Test (unseen)</p>
            <p className="text-white font-semibold">{eval_.split.test}</p>
            <p className="text-slate-400 mt-1">{eval_.split.n_test.toLocaleString()} visits</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          The model was fit on Jan–Sep and evaluated on Oct–Dec to simulate true operational deployment.
          The Oct–Dec period appears shaded in control charts.
        </p>
      </section>

      {/* MAE table */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-1">
          Forecast Error on Unseen Oct–Dec Visits
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Mean absolute error in minutes. Lower is better. Our model reduces error by{" "}
          <strong className="text-white">
            {(((baseline - eval_.mae.ols_additive) / baseline) * 100).toFixed(0)}%
          </strong>{" "}
          vs the training-average baseline.
        </p>
        <div className="space-y-3">
          {maeEntries.map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span
                  className={
                    key === "ols_additive"
                      ? "text-[#19E3F5] font-semibold"
                      : "text-slate-300"
                  }
                >
                  {MAE_LABELS[key] ?? key}
                </span>
                <span className="text-white font-bold tabular-nums">
                  {value.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(value / maxMae) * 100}%`,
                    background:
                      key === "ols_additive"
                        ? "#19E3F5"
                        : key === "train_average"
                        ? "#E5484D"
                        : "#1e3a5f",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ablation */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-1">
          Feature Ablation — Gradient Boosting Challenger
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Adding extra features never meaningfully improved on the department + triage
          reference. This is why CareWeave does not imply time-of-day, weekday, or
          patient demographics matter.
        </p>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Features
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                  MAE (min)
                </th>
              </tr>
            </thead>
            <tbody>
              {model.ablation.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-white/5 ${
                    i === 0 ? "bg-[#19E3F5]/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-slate-300">{row.features}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-white tabular-nums">
                    {row.mae.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Coverage & pinball */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">
            Interval Coverage &amp; Calibration
          </h2>
          <div className="space-y-3 text-sm">
            <StatRow
              label="P10–P90 interval coverage"
              value={`${(eval_.interval_p10_p90_coverage * 100).toFixed(1)}%`}
              note="Target ~80%"
              good
            />
            <StatRow
              label="RMSE"
              value={`${eval_.rmse_ols.toFixed(1)} min`}
              note="Root mean squared error"
            />
            <StatRow
              label="Noise std dev"
              value={`${eval_.noise_sd_minutes.toFixed(1)} min`}
              note="Irreducible spread per visit"
            />
            <StatRow
              label="AUC (wait ≥ 60 min)"
              value={eval_.auc_wait_ge_60.toFixed(3)}
              note="Area under ROC curve"
              good
            />
          </div>

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-5 mb-3">
            Calibration: predicted vs observed P(wait ≥ t)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {["Threshold", "Predicted", "Observed", "Brier"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-bold text-slate-400 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eval_.calibration.map((c) => (
                  <tr
                    key={c.threshold}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-3 py-2 text-sm text-slate-300">≥{c.threshold}m</td>
                    <td className="px-3 py-2 text-sm text-white tabular-nums">
                      {(c.predicted * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-sm text-white tabular-nums">
                      {(c.observed * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-400 tabular-nums">
                      {c.brier.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Alert backtest */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-1">Alert Backtest</h2>
          <p className="text-xs text-slate-500 mb-4">{eval_.alerts.rule}</p>
          <StatRow
            label="False alarm rate (window)"
            value={`${(eval_.alerts.false_alarm_window_rate * 100).toFixed(1)}%`}
            note="Near chance level"
          />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-3">
            Injected delay detection
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {["Injected delay", "Detected", "Median lag", "Trials"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-bold text-slate-400 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(eval_.alerts.injected).map(([k, v]) => (
                  <tr
                    key={k}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-3 py-2 text-sm text-slate-300">+{k} min</td>
                    <td className="px-3 py-2 text-sm text-white tabular-nums">
                      {(v.detected * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-300 tabular-nums">
                      {v.median_days_to_alert != null
                        ? `${v.median_days_to_alert} days`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-400 tabular-nums">
                      {v.trials}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 mt-3">{eval_.alerts.note}</p>
        </section>
      </div>

      {/* Data quality */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">Data Quality</h2>
        <ul className="space-y-2 text-sm">
          <QualityItem
            ok={insights.data_quality.wait_minutes_matches_timestamps}
            text={`wait_minutes matches arrival/service_start timestamps: ${insights.data_quality.wait_minutes_matches_timestamps ? "✓ consistent" : "⚠ discrepancy found"}`}
          />
          <QualityItem
            ok={insights.data_quality.patients_without_visits === 0}
            text={`Patients without any visits: ${insights.data_quality.patients_without_visits}`}
          />
          <QualityItem
            ok={insights.data_quality.chronic_condition_missing_pct < 5}
            text={`chronic_condition missing: ${insights.data_quality.chronic_condition_missing_pct}% of patients (${insights.data_quality.chronic_condition_missing} records)`}
          />
          <QualityItem
            ok={false}
            text={`Diagnostic test timeline conflict: ${insights.diagnostics.timeline_conflict.outside_visit_window.toLocaleString()} of ${insights.diagnostics.timeline_conflict.tests.toLocaleString()} tests fall outside the linked visit window.`}
            warning
          />
        </ul>
      </section>

      {/* Limitations */}
      <section className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
        <h2 className="text-base font-bold text-amber-300 mb-3">
          Limitations and Responsible Use
        </h2>
        <ul className="space-y-2 text-sm text-slate-300">
          {[
            "All data is synthetic. CareWeave is a demonstration prototype only.",
            "Only department and triage level predict wait. Hour, weekday, month, demographics, and visit type showed no usable signal and are not used.",
            "About 17 minutes of irreducible noise remains per visit. Ranges, not point predictions, should guide decisions.",
            "Alert thresholds were tuned on synthetic data and would need recalibration before operational deployment.",
            "No external AI or LLM API is used. Inference runs entirely from the pre-trained model.json artifact.",
            "This output is for operational planning only. It must never be used for clinical decisions or presented to patients.",
          ].map((text, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">⚠</span>
              {text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatRow({
  label,
  value,
  note,
  good,
}: {
  label: string;
  value: string;
  note?: string;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
      <div>
        <span className="text-slate-300">{label}</span>
        {note && <span className="text-xs text-slate-600 ml-2">{note}</span>}
      </div>
      <span
        className={`font-bold tabular-nums text-sm ${
          good ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function QualityItem({
  ok,
  text,
  warning,
}: {
  ok: boolean;
  text: string;
  warning?: boolean;
}) {
  return (
    <li className="flex gap-2 text-slate-300">
      <span
        className={`mt-0.5 flex-shrink-0 ${
          warning ? "text-amber-400" : ok ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {warning ? "⚠" : ok ? "✓" : "✗"}
      </span>
      {text}
    </li>
  );
}
