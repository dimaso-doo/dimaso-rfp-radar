import { NextRequest, NextResponse } from "next/server";
import { runTargetScan } from "@/lib/target-scan";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await runTargetScan({ limit: Number(process.env.TARGET_SCAN_DAILY_LIMIT) || 10 }));
}
