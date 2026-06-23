import { assessSearchResult, extractDeadline, extractPublicPage, isPublicUrlAvailable, searchTargetDomain, type SearchResult } from "@/lib/ingestion";
import { scoreOpportunity } from "@/lib/scoring";
import { db } from "@/lib/db";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function domainFromWebsite(website: string) {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function reviewReason(params: { deadline: Date | null; score: ReturnType<typeof scoreOpportunity>; extractedLength: number }) {
  const today = startOfToday();
  if (params.extractedLength < 200) return "Source text was too short for automatic verification";
  if (!params.deadline) return "Looks relevant, but deadline was not detected automatically";
  if (params.deadline <= today) return "Deadline appears to have passed";
  if (params.score.status === "Rejected - Government") return "Government / public procurement signal";
  if (params.score.score < 20) return "Low fit score after extraction";
  return "Needs human review";
}

async function processTargetResult(result: SearchResult, target: { id: string; name: string; website: string }) {
  const initialAssessment = assessSearchResult(result);
  const hardRejections = [
    "RFP aggregator or public procurement portal",
    "Government, education procurement, or bonding content",
    "Editorial, template, or instructional content",
    "Clearly outdated opportunity",
  ];
  if (!initialAssessment.accepted && hardRejections.includes(initialAssessment.rejectionReason ?? "")) return null;

  let extractedText = "";
  let documents: string[] = [];
  try {
    const extracted = await extractPublicPage(result.url);
    extractedText = extracted.text;
    documents = extracted.documents;
  } catch {}

  const completeText = `${result.title} ${result.snippet} ${extractedText}`;
  const assessment = assessSearchResult({ ...result, snippet: completeText.slice(0, 3000) });
  if (!assessment.accepted) return null;
  const deadline = extractDeadline(completeText);
  const score = scoreOpportunity({ url: result.url, text: completeText, deadline });
  if (score.score < 20 || score.status === "Rejected - Government") return null;
  const reason = reviewReason({ deadline, score, extractedLength: extractedText.length });
  const today = startOfToday();
  const email = completeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const documentUrl = documents[0] ?? null;

  const review = await db.reviewCandidate.upsert({
    where: { url: result.url },
    update: {
      title: result.title,
      organization: target.name,
      snippet: result.snippet,
      rawText: extractedText || null,
      documentUrl,
      deadline,
      category: assessment.category,
      fitScore: score.score,
      status: deadline && deadline > today && score.score >= 20 && score.status !== "Rejected - Government" ? "Verified" : "Review",
      reason,
      targetId: target.id,
    },
    create: {
      title: result.title,
      organization: target.name,
      url: result.url,
      snippet: result.snippet,
      rawText: extractedText || null,
      documentUrl,
      deadline,
      category: assessment.category,
      fitScore: score.score,
      status: deadline && deadline > today && score.score >= 20 && score.status !== "Rejected - Government" ? "Verified" : "Review",
      reason,
      targetId: target.id,
    },
  });

  if (review.status === "Verified") {
    const linkAvailable = await isPublicUrlAvailable(result.url);
    const data = {
      title: result.title,
      organization: target.name,
      snippet: result.snippet,
      rawText: extractedText,
      documentUrl,
      aiSummary: result.snippet || extractedText.slice(0, 420),
      deadline,
      contactEmail: email,
      category: assessment.category,
      scope: result.snippet || extractedText.slice(0, 600),
      submissionMethod: email ? "Email submission" : "See original source",
      risks: [!email ? "Submission email was not detected" : null].filter(Boolean),
      fitScore: score.score,
      recommendation: score.recommendation,
      status: "New",
      scoreReasons: score.reasons,
      linkAvailable,
      lastLinkCheckAt: new Date(),
    };
    await db.opportunity.upsert({
      where: { url: result.url },
      update: data,
      create: { url: result.url, ...data },
    });
  }

  return review;
}

export async function runTargetScan(options: { limit?: number } = {}) {
  const targets = await db.targetOrganization.findMany({
    where: { active: true },
    orderBy: [{ priority: "asc" }, { lastScannedAt: "asc" }, { updatedAt: "asc" }],
    take: options.limit ?? 10,
  });

  let scannedResults = 0;
  let reviewSaved = 0;
  const errors: Array<{ target: string; error: string }> = [];

  for (const target of targets) {
    try {
      const domain = domainFromWebsite(target.website);
      const results = await searchTargetDomain(domain, target.rfpUrl ? [target.rfpUrl] : []);
      scannedResults += results.length;
      for (const result of results) {
        const saved = await processTargetResult(result, target);
        if (saved) reviewSaved += 1;
      }
      await db.targetOrganization.update({ where: { id: target.id }, data: { lastScannedAt: new Date() } });
    } catch (error) {
      errors.push({ target: target.name, error: error instanceof Error ? error.message : "Target scan failed" });
    }
  }

  return {
    ranAt: new Date().toISOString(),
    targets: targets.length,
    scannedResults,
    reviewSaved,
    reviewTotal: await db.reviewCandidate.count(),
    verifiedTotal: await db.reviewCandidate.count({ where: { status: "Verified" } }),
    opportunities: await db.opportunity.count(),
    errors,
  };
}
