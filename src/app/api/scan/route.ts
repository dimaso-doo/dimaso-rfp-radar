import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/lib/scan";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const sourceId = typeof body?.sourceId === "string" && body.sourceId ? body.sourceId : undefined;
    return NextResponse.json(await runScan({ sourceId }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 },
    );
  }
}
