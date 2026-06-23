import { NextRequest, NextResponse } from "next/server";
import { runTargetScan } from "@/lib/target-scan";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const limit = Math.min(100, Math.max(1, Number(body?.limit) || 10));
    return NextResponse.json(await runTargetScan({ limit }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Target scan failed" }, { status: 500 });
  }
}
