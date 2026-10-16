// CareWeave type definitions
// All data sourced from ml/artifacts/*.json — never hardcoded.

// ─── model.json ────────────────────────────────────────────────────────────────
export interface ModelJSON {
  version: number;
  target: string;
  min_wait: number;
  departments: string[];
  triage: TriageLevel[];
  intercept: number;
  dept_effect: Record<string, number>;
  triage_effect: Record<TriageLevel, number>;
  residual_quantile_probs: number[];
  residual_quantiles: Record<TriageLevel, number[]>;
  how_to_predict: string;
  evaluation: Evaluation;
  ablation: AblationRow[];
}

export type TriageLevel = "Critical" | "High" | "Medium" | "Low";

export interface Evaluation {
  split: { train: string; n_train: number; test: string; n_test: number };
  mae: {
    train_average: number;
    triage_only: number;
    department_triage_cell_mean: number;
    ols_additive: number;
    gradient_boosting_all_features: number;
  };
  rmse_ols: number;
  noise_sd_minutes: number;
  interval_p10_p90_coverage: number;
  pinball: { q10: number; q50: number; q90: number };
  calibration: CalibrationPoint[];
  auc_wait_ge_60: number;
  alerts: AlertBacktest;
}

export interface CalibrationPoint {
  threshold: number;
  predicted: number;
  observed: number;
  brier: number;
  brier_base_rate: number;
}

export interface AlertBacktest {
  rule: string;
  false_alarm_window_rate: number;
  injected: Record<
    string,
    { detected: number; median_days_to_alert: number | null; trials: number }
  >;
  note: string;
}

export interface AblationRow {
  features: string;
  mae: number;
}

// ─── insights.json ────────────────────────────────────────────────────────────
export interface InsightsJSON {
  overall: {
    visits: number;
    mean_wait: number;
    triage_mean: Record<TriageLevel, number>;
  };
  departments: DepartmentInsight[];
  diagnostics: DiagnosticsInsight;
  data_quality: DataQuality;
}

export interface DepartmentInsight {
  id: string;
  name: string;
  service_type: string;
  staff: number;
  beds: number;
  daily_capacity: number;
  visits: number;
  mean_wait: number;
  triage_mix_effect: number;
  gap_vs_peers: number;
  gap_z: number;
  /** cells[0]=Critical, [1]=High, [2]=Medium, [3]=Low */
  cells: TriageCell[];
  /** hist_10min_bins[triageIndex][binIndex], 16 bins: 0-10, 10-20, ..., 150+ */
  hist_10min_bins: number[][];
  weekly_z: number[];
}

export interface TriageCell {
  triage: TriageLevel;
  n: number;
  mean: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface DiagnosticsInsight {
  by_test_type: Record<string, DiagSummary>;
  by_priority: Record<string, DiagSummary>;
  timeline_conflict: {
    tests: number;
    outside_visit_window: number;
    note: string;
  };
}

export interface DiagSummary {
  n: number;
  median: number;
  p90: number;
  share_over_120: number;
}

export interface DataQuality {
  patients_without_visits: number;
  chronic_condition_missing: number;
  chronic_condition_missing_pct: number;
  wait_minutes_matches_timestamps: boolean;
}

// ─── Ranking ──────────────────────────────────────────────────────────────────
export type EvidenceLabel = "Strong" | "Moderate" | "Weak" | "Faster than peers";

export interface RankedDepartment {
  dept: DepartmentInsight;
  over_total: number;
  /** over_dk per triage level index */
  over_by_triage: number[];
  score: number;
  evidence: EvidenceLabel;
  evidenceClass: "strong" | "moderate" | "weak" | "faster";
  rank: number;
}

// ─── Forecast ─────────────────────────────────────────────────────────────────
export interface ForecastResult {
  mean: number;
  p10: number;
  p50: number;
  p90: number;
  /** P(wait >= threshold) */
  p_ge: number;
  department_id: string;
  triage: TriageLevel;
  threshold: number;
}
