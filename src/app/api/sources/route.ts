import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (query.length < 3 || query.length > 200) {
    return NextResponse.json({ error: "Query must contain 3–200 characters" }, { status: 400 });
  }

  const existing = await db.searchSource.findFirst({
    where: { query: { equals: query, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({ error: "This source already exists" }, { status: 409 });
  }

  const source = await db.searchSource.create({ data: { query, active: true } });
  return NextResponse.json(source, { status: 201 });
}
