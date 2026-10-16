// API route: POST /api/predict
// Body: { department_id: string, triage: string, threshold?: number }
// Returns: ForecastResult

import { NextRequest, NextResponse } from "next/server";
import { predict } from "@/lib/predict";
import modelJson from "@/data/model.json";
import type { ModelJSON, TriageLevel } from "@/lib/types";

const model = modelJson as ModelJSON;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { department_id, triage, threshold = 60 } = body as {
      department_id: string;
      triage: TriageLevel;
      threshold?: number;
    };

    if (!department_id || !triage) {
      return NextResponse.json(
        { error: "department_id and triage are required" },
        { status: 400 }
      );
    }

    const result = predict(model, department_id, triage, threshold);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
