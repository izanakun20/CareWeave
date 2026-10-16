/**
 * rank.ts — Investigate-first ranking for departments.
 *
 * Spec (from ANTIGRAVITY_PROMPT.md):
 *   over_dk = visits with wait >= T_k, from hist_10min_bins
 *   (T_k is a multiple of 10, so bin sums are exact)
 *   over_d = sum over k of over_dk
 *
 *   Weight from gap:
 *     gap_vs_peers > 0 AND gap_z >= 5  → "Strong"  (1.0)
 *     gap_vs_peers > 0 AND gap_z >= 2.5 → "Moderate" (0.8)
 *     gap_vs_peers > 0 otherwise         → "Weak"    (0.5)
 *     gap_vs_peers <= 0                  → "Faster than peers" (0.5)
 *
 *   score = over_d × weight
 *   Sort descending.
 *
 * Heat colour from ratio = mean / T_k:
 *   < 0.6   → teal  (HSL 170)
 *   = 1.0   → amber (HSL 40)
 *   ≥ 1.4   → red   (HSL 10)
 *   Linear interpolation in between.
 * Colour is decorative — numbers are always shown too.
 */

import type {
  DepartmentInsight,
  EvidenceLabel,
  RankedDepartment,
} from "./types";

const TRIAGE_ORDER = ["Critical", "High", "Medium", "Low"] as const;

/**
 * Count visits with wait >= targetMin from the 10-min histogram.
 * Bin i covers waits [10i, 10i+10); bin 15 covers 150+.
 * Because targets are multiples of 10, bin sums are exact.
 */
export function overTarget(hist: number[], targetMin: number): number {
  const startBin = Math.min(Math.floor(targetMin / 10), 15);
  let total = 0;
  for (let i = startBin; i < hist.length; i++) total += hist[i];
  return total;
}

/** Heat colour (HSL string) for a triage cell given mean wait and target. */
export function heatColor(meanWait: number, target: number): string {
  const ratio = meanWait / target;
  // ratio 0.6→teal (170°), 1.0→amber (40°), 1.4+→red (10°)
  const t = Math.max(0, Math.min(1, (ratio - 0.6) / 0.8));
  const hue = Math.round(170 - 160 * t);
  return `hsl(${hue} 60% 48% / 0.3)`;
}

/**
 * Rank all departments by score descending.
 * targets: [Critical, High, Medium, Low] in minutes.
 */
export function rankDepartments(
  departments: DepartmentInsight[],
  targets: [number, number, number, number]
): RankedDepartment[] {
  const ranked = departments.map((dept) => {
    const over_by_triage = TRIAGE_ORDER.map((_, k) =>
      overTarget(dept.hist_10min_bins[k], targets[k])
    );
    const over_total = over_by_triage.reduce((a, b) => a + b, 0);

    const { gap_vs_peers, gap_z } = dept;
    let weight: number;
    let evidence: EvidenceLabel;
    let evidenceClass: RankedDepartment["evidenceClass"];

    if (gap_vs_peers > 0) {
      if (Math.abs(gap_z) >= 5) {
        weight = 1.0;
        evidence = "Strong";
        evidenceClass = "strong";
      } else if (Math.abs(gap_z) >= 2.5) {
        weight = 0.8;
        evidence = "Moderate";
        evidenceClass = "moderate";
      } else {
        weight = 0.5;
        evidence = "Weak";
        evidenceClass = "weak";
      }
    } else {
      weight = 0.5;
      evidence = "Faster than peers";
      evidenceClass = "faster";
    }

    const score = over_total * weight;

    return {
      dept,
      over_total,
      over_by_triage,
      score,
      evidence,
      evidenceClass,
      rank: 0,
    } satisfies Omit<RankedDepartment, "rank"> & { rank: number };
  });

  ranked.sort((a, b) => b.score - a.score);
  ranked.forEach((d, i) => (d.rank = i + 1));

  return ranked;
}

/** Median of an array of numbers. */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
