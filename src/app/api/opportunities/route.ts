import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const sourceId = typeof body?.sourceId === "string" ? body.sourceId : "";
  const category = typeof body?.category === "string" ? body.category : "";

  if (id) {
    await db.opportunity.delete({ where: { id } });
    return NextResponse.json({ deleted: 1 });
  }

  if (body?.all === true) {
    const deleted = await db.opportunity.deleteMany({});
    return NextResponse.json({ deleted: deleted.count });
  }

  if (sourceId) {
    const deleted = await db.opportunity.deleteMany({ where: { sourceId } });
    return NextResponse.json({ deleted: deleted.count });
  }

  if (category) {
    const deleted = await db.opportunity.deleteMany({ where: { category } });
    return NextResponse.json({ deleted: deleted.count });
  }

  return NextResponse.json({ error: "Provide id, sourceId, category, or all=true" }, { status: 400 });
}
