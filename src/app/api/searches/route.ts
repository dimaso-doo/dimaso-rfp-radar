import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type IncomingSearch = { name?: unknown; terms?: unknown };
type SearchTerm = { query: string; active: boolean; priority: number; dateRestrict: string | null; notes: string | null };

function normalizeTerm(value: unknown): SearchTerm | null {
  if (typeof value === "string") {
    const query = value.trim();
    return query ? { query, active: true, priority: 3, dateRestrict: null, notes: null } : null;
  }
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const query = typeof item.query === "string" ? item.query.trim() : "";
  if (!query) return null;
  const priority = Math.min(9, Math.max(1, Number(item.priority) || 3));
  return {
    query,
    active: item.enabled === false || String(item.enabled).toLowerCase() === "false" ? false : true,
    priority,
    dateRestrict: typeof item.dateRestrict === "string" && item.dateRestrict.trim() ? item.dateRestrict.trim() : null,
    notes: typeof item.notes === "string" && item.notes.trim() ? item.notes.trim() : null,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const input: IncomingSearch[] = Array.isArray(body?.searches) ? body.searches : [];
  const searches = input.map((item) => ({
    name: typeof item.name === "string" ? item.name.trim() : "",
    terms: Array.isArray(item.terms)
      ? [...new Map(item.terms.map(normalizeTerm).filter((term): term is SearchTerm => Boolean(term)).map((term) => [term.query.toLowerCase(), term])).values()]
      : [] as SearchTerm[],
  })).filter((item) => item.name.length >= 2 && item.name.length <= 100 && item.terms.length > 0);

  if (!searches.length) {
    return NextResponse.json({ error: "Add at least one search with one valid term" }, { status: 400 });
  }
  if (searches.reduce((sum, search) => sum + search.terms.length, 0) > 250) {
    return NextResponse.json({ error: "A single import can contain up to 250 terms" }, { status: 400 });
  }

  let added = 0;
  await db.$transaction(async (tx) => {
    for (const search of searches) {
      let profile = await tx.searchProfile.findFirst({ where: { name: { equals: search.name, mode: "insensitive" } } });
      profile ??= await tx.searchProfile.create({ data: { name: search.name } });
      for (const term of search.terms) {
        if (term.query.length < 3 || term.query.length > 2000) continue;
        const existing = await tx.searchSource.findFirst({ where: { query: { equals: term.query, mode: "insensitive" } } });
        if (existing) {
          await tx.searchSource.update({ where: { id: existing.id }, data: { profileId: profile.id, active: term.active, priority: term.priority, dateRestrict: term.dateRestrict, notes: term.notes } });
          continue;
        }
        await tx.searchSource.create({ data: { query: term.query, active: term.active, priority: term.priority, dateRestrict: term.dateRestrict, notes: term.notes, profileId: profile.id } });
        added += 1;
      }
    }
  });

  return NextResponse.json({ searches: searches.length, added }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (body?.all === true) {
    const deleted = await db.$transaction(async (tx) => {
      const terms = await tx.searchSource.deleteMany({});
      await tx.searchProfile.deleteMany({});
      return terms.count;
    });
    return NextResponse.json({ deleted });
  }

  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing search term id" }, { status: 400 });
  }

  const source = await db.searchSource.findUnique({ where: { id }, select: { profileId: true } });
  if (!source) {
    return NextResponse.json({ error: "Search term not found" }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.searchSource.delete({ where: { id } });
    if (source.profileId) {
      const remaining = await tx.searchSource.count({ where: { profileId: source.profileId } });
      if (remaining === 0) await tx.searchProfile.delete({ where: { id: source.profileId } });
    }
  });

  return NextResponse.json({ deleted: 1 });
}
