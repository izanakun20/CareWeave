// API route: GET /api/model
// Returns model evaluation data (evaluation + ablation) from model.json

import { NextResponse } from "next/server";
import modelJson from "@/data/model.json";
import insightsJson from "@/data/insights.json";
import type { ModelJSON, InsightsJSON } from "@/lib/types";

const model = modelJson as ModelJSON;
const insights = insightsJson as InsightsJSON;

export async function GET() {
  return NextResponse.json({
    evaluation: model.evaluation,
    ablation: model.ablation,
    how_to_predict: model.how_to_predict,
    data_quality: insights.data_quality,
    overall: insights.overall,
  });
}
