/**
 * predict.ts — client-safe inference matching ml/train.py exactly.
 * Formula (from model.json "how_to_predict"):
 *   mean = intercept + dept_effect[dept] + triage_effect[triage]
 *   quantile q = max(min_wait, mean + interp(q, probs, residual_quantiles[triage]))
 *   P(wait >= t) = mean over 99 residual quantiles of 1[mean+r >= t]
 *
 * No external AI or LLM API is used. All parameters come from model.json.
 */

import type { ModelJSON, TriageLevel, ForecastResult } from "./types";

/** Linear interpolation matching numpy.interp */
function interp(x: number, xp: number[], fp: number[]): number {
  if (x <= xp[0]) return fp[0];
  if (x >= xp[xp.length - 1]) return fp[fp.length - 1];
  let lo = 0,
    hi = xp.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xp[mid] <= x) lo = mid;
    else hi = mid;
  }
  const t = (x - xp[lo]) / (xp[hi] - xp[lo]);
  return fp[lo] + t * (fp[hi] - fp[lo]);
}

export function predict(
  model: ModelJSON,
  department_id: string,
  triage: TriageLevel,
  threshold = 60
): ForecastResult {
  const mu =
    model.intercept +
    (model.dept_effect[department_id] ?? 0) +
    (model.triage_effect[triage] ?? 0);

  const probs = model.residual_quantile_probs;
  const residuals = model.residual_quantiles[triage];
  const minWait = model.min_wait;

  const quantile = (q: number) =>
    Math.max(minWait, mu + interp(q, probs, residuals));

  // P(wait >= t) = fraction of residuals where mean+r >= t
  const p_ge =
    residuals.filter((r) => mu + r >= threshold).length / residuals.length;

  return {
    mean: mu,
    p10: quantile(0.1),
    p50: quantile(0.5),
    p90: quantile(0.9),
    p_ge,
    department_id,
    triage,
    threshold,
  };
}
