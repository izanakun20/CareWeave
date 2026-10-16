// API route: GET /api/diagnostics
// Returns diagnostics insight from insights.json

import { NextResponse } from "next/server";
import insightsJson from "@/data/insights.json";
import type { InsightsJSON } from "@/lib/types";

const insights = insightsJson as InsightsJSON;

export async function GET() {
  return NextResponse.json(insights.diagnostics);
}
