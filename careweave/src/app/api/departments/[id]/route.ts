// API route: GET /api/departments/[id]
// Returns full DepartmentInsight for the given department ID

import { NextRequest, NextResponse } from "next/server";
import insightsJson from "@/data/insights.json";
import type { InsightsJSON } from "@/lib/types";

const insights = insightsJson as InsightsJSON;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dept = insights.departments.find((d) => d.id === id);
  if (!dept) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }
  return NextResponse.json(dept);
}
