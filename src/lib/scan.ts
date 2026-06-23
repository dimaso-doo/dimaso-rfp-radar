import { assessSearchResult, extractDeadline, extractPublicPage, isPublicUrlAvailable, searchWeb, type SearchResult } from "@/lib/ingestion";
import { scoreOpportunity } from "@/lib/scoring";
import { db } from "@/lib/db";

type Candidate = SearchResult & { sourceId: string };

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function runScan(options: { sourceId?: string } = {}) {
  const sources = await db.searchSource.findMany({
    where: { active: true, ...(options.sourceId ? { id: options.sourceId } : {}) },
  });
  const batches: Array<{ source: typeof sources[number]; results: SearchResult[]; error: string | null }> = [];
  for (const source of sources) {
    try {
      const results = await searchWeb(source.query, source.dateRestrict);
      await db.searchSource.update({ where: { id: source.id }, data: { lastRunAt: new Date() } });
      batches.push({ source, results, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      batches.push({ source, results: [], error: message });
      if (/billing|quota|HTTP 402/i.test(message)) break;
    }
  }

  const unique = new Map<string, Candidate>();
  for (const batch of batches) {
    for (const result of batch.results) {
      if (!unique.has(result.url)) unique.set(result.url, { ...result, sourceId: batch.source.id });
    }
  }

  const candidates = [...unique.values()]
    .map((result) => ({ result, assessment: assessSearchResult(result) }))
    .filter(({ assessment }) => assessment.accepted);

  const saved = (await Promise.all(candidates.map(async ({ result, assessment }) => {
    try {
      const extracted = await extractPublicPage(result.url);
      if (extracted.text.length < 200) return null;

      const completeText = `${result.title} ${result.snippet} ${extracted.text}`;
      const deadline = extractDeadline(completeText);
      if (!deadline || deadline <= startOfToday()) return null;
      const score = scoreOpportunity({ url: result.url, text: completeText, deadline });
      if (score.score < 20 || score.status === "Rejected - Government") return null;

      const email = completeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
      const summary = result.snippet || extracted.text.slice(0, 420);
      const risks = [
        !deadline ? "Deadline was not detected automatically" : null,
        !email ? "Submission email was not detected" : null,
      ].filter((risk): risk is string => Boolean(risk));

      const data = {
        title: result.title,
        organization: assessment.organization,
        snippet: result.snippet,
        rawText: extracted.text,
        documentUrl: extracted.documents[0] ?? null,
        aiSummary: summary,
        deadline,
        contactEmail: email,
        category: assessment.category,
        scope: result.snippet || extracted.text.slice(0, 600),
        submissionMethod: email ? "Email submission" : "See original source",
        risks,
        fitScore: score.score,
        recommendation: score.recommendation,
        status: deadline ? score.status : "Verify deadline",
        scoreReasons: score.reasons,
      };
      return db.opportunity.upsert({
        where: { url: result.url },
        update: { ...data, linkAvailable: true },
        create: { url: result.url, ...data, sourceId: result.sourceId, linkAvailable: true },
      });
    } catch {
      return null;
    }
  }))).filter(Boolean);

  const savedIds = saved.flatMap((opportunity) => opportunity ? [opportunity.id] : []);
  const links = savedIds.length
    ? await db.opportunity.findMany({ where: { id: { in: savedIds } }, select: { id: true, url: true, documentUrl: true } })
    : [];
  let unavailable = 0;
  for (let index = 0; index < links.length; index += 8) {
    await Promise.all(links.slice(index, index + 8).map(async (opportunity) => {
      const originalAvailable = await isPublicUrlAvailable(opportunity.url);
      const documentAvailable = opportunity.documentUrl
        ? opportunity.documentUrl === opportunity.url ? originalAvailable : await isPublicUrlAvailable(opportunity.documentUrl)
        : false;
      const linkAvailable = originalAvailable || documentAvailable;
      if (!linkAvailable) unavailable += 1;
      await db.opportunity.update({
        where: { id: opportunity.id },
        data: { linkAvailable, lastLinkCheckAt: new Date() },
      });
    }));
  }

  return {
    ranAt: new Date().toISOString(),
    queries: sources.length,
    scanned: batches.reduce((sum, batch) => sum + batch.results.length, 0),
    uniqueResults: unique.size,
    candidates: candidates.length,
    verifiedAndSaved: saved.length,
    linksChecked: links.length,
    unavailableHidden: unavailable,
    errors: batches.filter((batch) => batch.error).map((batch) => ({ query: batch.source.query, error: batch.error })),
  };
}
