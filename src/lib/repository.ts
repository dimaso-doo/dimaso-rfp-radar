import { db } from "./db";
import { opportunities as demo, type Opportunity } from "./data";

export type OpportunityFilters = { sourceId?: string; category?: string; q?: string };

export async function getOpportunities(filters: OpportunityFilters = {}): Promise<Opportunity[]> {
  if (!process.env.DATABASE_URL) return demo;
  const rows = await db.opportunity.findMany({
    where: {
      linkAvailable: true,
      ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.q ? {
        OR: [
          { title: { contains: filters.q, mode: "insensitive" } },
          { organization: { contains: filters.q, mode: "insensitive" } },
          { snippet: { contains: filters.q, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: [{ fitScore: "desc" }, { discoveredAt: "desc" }],
    include: { source: { include: { profile: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    organization: row.organization ?? "Unknown organization",
    url: row.url,
    documentUrl: row.documentUrl,
    deadline: row.deadline ? row.deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not specified",
    email: row.contactEmail ?? "Not found",
    category: row.category ?? "Website services",
    score: row.fitScore,
    recommendation: row.recommendation as Opportunity["recommendation"],
    status: row.status,
    discovered: row.discoveredAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    summary: row.aiSummary ?? row.snippet ?? "Awaiting summary.",
    scope: row.scope ?? "See the extracted source text for scope details.",
    submission: row.submissionMethod ?? "Not specified",
    risks: Array.isArray(row.risks) ? row.risks as string[] : [],
    reasons: Array.isArray(row.scoreReasons) ? row.scoreReasons as string[] : [],
    text: row.rawText ?? row.snippet ?? "No extracted text available.",
    sourceId: row.sourceId,
    sourceQuery: row.source?.query ?? null,
    searchName: row.source?.profile?.name ?? null,
  }));
}

export async function getOpportunity(id: string) {
  return (await getOpportunities()).find((item) => item.id === id);
}

export async function getOpportunityFilterOptions() {
  if (!process.env.DATABASE_URL) return { sources: [], categories: [] };
  const [sources, categoryRows] = await Promise.all([
    db.searchSource.findMany({
      orderBy: { createdAt: "asc" },
      include: { profile: true, _count: { select: { opportunities: true } } },
    }),
    db.opportunity.findMany({
      where: { linkAvailable: true, category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);
  return {
    sources: sources.map((source) => ({ id: source.id, query: source.query, search: source.profile?.name ?? "Website RFP Radar", count: source._count.opportunities })),
    categories: categoryRows.map((row) => row.category).filter((category): category is string => Boolean(category)),
  };
}
