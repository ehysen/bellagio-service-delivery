import { NextRequest, NextResponse } from "next/server";
import { determine } from "@/lib/engine";
import { runPrecertQC } from "@/lib/qc/precert_checks";
import type { Household } from "@/lib/models";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Household;
  try {
    body = (await req.json()) as Household;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.members) || body.members.length === 0) {
    return NextResponse.json(
      { error: "Household must include at least one member." },
      { status: 400 },
    );
  }

  const determination = determine(body);
  const qcFindings = runPrecertQC({
    household: body,
    determination,
    statedBenefit: determination.ongoingMonthlyBenefit,
  });

  return NextResponse.json({ determination, qcFindings });
}
