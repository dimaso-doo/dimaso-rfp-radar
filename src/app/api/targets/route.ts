import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const website = normalizeUrl(String(body?.website ?? ""));
    const rfpUrl = normalizeUrl(String(body?.rfpUrl ?? ""));
    const category = String(body?.category ?? "US organization").trim() || "US organization";

    if (!name || !website || !rfpUrl) {
      return NextResponse.json({ error: "Name, website and RFP/procurement URL are required." }, { status: 400 });
    }

    const target = await db.targetOrganization.upsert({
      where: { website },
      update: { name, rfpUrl, category, country: "United States", active: true, priority: 1, lastScannedAt: null },
      create: { name, website, rfpUrl, category, country: "United States", active: true, priority: 1 },
    });

    return NextResponse.json({ target });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save target organization." }, { status: 500 });
  }
}
