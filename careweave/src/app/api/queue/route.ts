// API route: GET /api/queue?critical=20&high=40&medium=60&low=90
// Returns departments ranked by score

import { NextRequest, NextResponse } from "next/server";
import { rankDepartments } from "@/lib/rank";
import insightsJson from "@/data/insights.json";
import type { InsightsJSON } from "@/lib/types";

const insights = insightsJson as InsightsJSON;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const targets: [number, number, number, number] = [
    Number(sp.get("critical") ?? 20),
    Number(sp.get("high") ?? 40),
    Number(sp.get("medium") ?? 60),
    Number(sp.get("low") ?? 90),
  ];

  const ranked = rankDepartments(insights.departments, targets);
  return NextResponse.json(ranked);
}
