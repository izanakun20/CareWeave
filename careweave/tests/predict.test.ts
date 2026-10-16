/**
 * Parity test: predict() must match ml/artifacts/parity.json within 0.01.
 * Runs with Node.js built-in test runner (node:test).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { predict } from "../src/lib/predict.ts";
import modelData from "../src/data/model.json" with { type: "json" };
import parityData from "../src/data/parity.json" with { type: "json" };
import type { ModelJSON, ForecastResult, TriageLevel } from "../src/lib/types";

const model = modelData as unknown as ModelJSON;

// parity.json is an array of {department_id, triage, threshold, mean, p10, p50, p90, p_ge}
type ParityRow = {
  department_id: string;
  triage: string;
  threshold: number;
  mean: number;
  p10: number;
  p50: number;
  p90: number;
  p_ge: number;
};

const TOL = 0.01;

describe("predict() parity against ml/artifacts/parity.json", () => {
  for (const row of parityData as ParityRow[]) {
    it(`${row.department_id} / ${row.triage} @ thr=${row.threshold}`, () => {
      const result: ForecastResult = predict(
        model,
        row.department_id,
        row.triage as TriageLevel,
        row.threshold
      );

      assert.ok(
        Math.abs(result.mean - row.mean) <= TOL,
        `mean diff ${Math.abs(result.mean - row.mean)} > ${TOL}`
      );
      assert.ok(
        Math.abs(result.p10 - row.p10) <= TOL,
        `p10 diff ${Math.abs(result.p10 - row.p10)} > ${TOL}`
      );
      assert.ok(
        Math.abs(result.p50 - row.p50) <= TOL,
        `p50 diff ${Math.abs(result.p50 - row.p50)} > ${TOL}`
      );
      assert.ok(
        Math.abs(result.p90 - row.p90) <= TOL,
        `p90 diff ${Math.abs(result.p90 - row.p90)} > ${TOL}`
      );
      assert.ok(
        Math.abs(result.p_ge - row.p_ge) <= TOL,
        `p_ge diff ${Math.abs(result.p_ge - row.p_ge)} > ${TOL}`
      );
    });
  }
});

