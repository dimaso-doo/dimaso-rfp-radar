import { NextRequest, NextResponse } from "next/server";
import { runTargetScan } from "@/lib/target-scan";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const limit = Math.min(100, Math.max(1, Number(body?.limit) || 10));
    const targetIds = Array.isArray(body?.targetIds)
      ? body.targetIds.map((id: unknown) => String(id)).filter(Boolean).slice(0, 250)
      : undefined;
    const scanAll = Boolean(body?.scanAll);
    return NextResponse.json(await runTargetScan({ limit, targetIds, scanAll }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Target scan failed" }, { status: 500 });
  }
}
