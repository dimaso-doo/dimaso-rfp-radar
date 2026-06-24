import { assessSearchResult, extractDeadline, extractPublicPage, isPublicUrlAvailable, searchTargetDomain, type SearchResult } from "@/lib/ingestion";
import { scoreOpportunity } from "@/lib/scoring";
import { db } from "@/lib/db";
import { createHash } from "crypto";

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

function reviewReason(params: { deadline: Date | null; score: ReturnType<typeof scoreOpportunity>; extractedLength: number; changed: boolean }) {
  const today = startOfToday();
  if (params.extractedLength < 200) return "Source text was too short for automatic verification";
  if (params.changed) return "Target RFP/vendor page changed since the previous scan";
  if (!params.deadline) return "Looks relevant, but deadline was not detected automatically";
  if (params.deadline <= today) return "Deadline appears to have passed";
  if (params.score.status === "Rejected - Government") return "Government / public procurement signal";
  if (params.score.score < 20) return "Low fit score after extraction";
  return "Needs human review";
}

function contentFingerprint(input: { title: string; snippet: string; extractedText: string; documents: string[] }) {
  const normalized = `${input.title}\n${input.snippet}\n${input.extractedText}\n${input.documents.join("\n")}`
    .toLowerCase()
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+20\d{2}/gi, "DATE")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]20\d{2}\b/g, "DATE")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalized).digest("hex");
}

async function upsertSnapshot(params: { targetId: string; url: string; title: string; contentHash: string }) {
  const existing = await db.targetPageSnapshot.findUnique({
    where: { targetId_url: { targetId: params.targetId, url: params.url } },
  });
  const changed = !existing || existing.contentHash !== params.contentHash;
  await db.targetPageSnapshot.upsert({
    where: { targetId_url: { targetId: params.targetId, url: params.url } },
    update: {
      title: params.title,
      contentHash: params.contentHash,
      lastScannedAt: new Date(),
      ...(changed ? { lastChangedAt: new Date() } : {}),
    },
    create: {
      targetId: params.targetId,
      url: params.url,
      title: params.title,
      contentHash: params.contentHash,
      lastChangedAt: new Date(),
      lastScannedAt: new Date(),
    },
  });
  return changed;
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
  let changed = true;
  try {
    if (!(await isPublicUrlAvailable(result.url))) return null;
    const extracted = await extractPublicPage(result.url);
    extractedText = extracted.text;
    documents = extracted.documents;
    const contentHash = contentFingerprint({ title: result.title, snippet: result.snippet, extractedText, documents });
    changed = await upsertSnapshot({ targetId: target.id, url: result.url, title: result.title, contentHash });
  } catch {}
  if (!changed && extractedText.length >= 200) return { saved: false, changed: false };

  const completeText = `${result.title} ${result.snippet} ${extractedText}`;
  const assessment = assessSearchResult({ ...result, snippet: completeText.slice(0, 3000) });
  if (!assessment.accepted) return { saved: false, changed };
  const deadline = extractDeadline(completeText);
  const score = scoreOpportunity({ url: result.url, text: completeText, deadline });
  if (score.score < 20 || score.status === "Rejected - Government") return { saved: false, changed };
  const reason = reviewReason({ deadline, score, extractedLength: extractedText.length, changed });
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
      linkAvailable: true,
      lastLinkCheckAt: new Date(),
    };
    await db.opportunity.upsert({
      where: { url: result.url },
      update: data,
      create: { url: result.url, ...data },
    });
  }

  return { saved: Boolean(review), changed };
}

export async function runTargetScan(options: { limit?: number; targetIds?: string[]; scanAll?: boolean } = {}) {
  const targets = await db.targetOrganization.findMany({
    where: options.targetIds?.length ? { id: { in: options.targetIds } } : { active: true },
    orderBy: [{ priority: "asc" }, { lastScannedAt: "asc" }, { updatedAt: "asc" }],
    ...(options.scanAll || options.targetIds?.length ? {} : { take: options.limit ?? 10 }),
  });

  let scannedResults = 0;
  let changedPages = 0;
  let reviewSaved = 0;
  const errors: Array<{ target: string; error: string }> = [];

  for (const target of targets) {
    try {
      const domain = domainFromWebsite(target.website);
      const results = await searchTargetDomain(domain, target.rfpUrl ? [target.rfpUrl] : []);
      scannedResults += results.length;
      for (const result of results) {
        const saved = await processTargetResult(result, target);
        if (saved?.changed) changedPages += 1;
        if (saved?.saved) reviewSaved += 1;
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
    changedPages,
    reviewSaved,
    reviewTotal: await db.reviewCandidate.count(),
    verifiedTotal: await db.reviewCandidate.count({ where: { status: "Verified" } }),
    opportunities: await db.opportunity.count(),
    errors,
  };
}
