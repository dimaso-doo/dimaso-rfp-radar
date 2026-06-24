import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type Candidate = {
  name: string;
  website: string;
  rfpUrl: string;
  category: string;
  notes: string;
};

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TARGET_COUNT = Number(process.env.DISCOVERY_TARGET_COUNT ?? 1000);
const DRY_RUN = process.env.DRY_RUN === "1";
const USER_AGENT = "Dimaso-RFP-Radar/1.0 (+private opportunity research)";

const searchQueries = [
  '"procurement opportunities" "requests for proposals" nonprofit -site:.gov -school -district',
  '"vendor opportunities" "request for proposals" nonprofit -site:.gov -school -district',
  '"business opportunities" "request for proposals" nonprofit -site:.gov -school -district',
  '"RFP & Vendor Opportunities" nonprofit',
  '"Current Contracting & Procurement Opportunities" nonprofit',
  '"open RFPs" "vendor" nonprofit',
  '"request for proposal opportunities" association -site:.gov',
  '"requests for proposals" "association" "vendor" -site:.gov',
  '"request for proposals" "foundation" "vendor" -grant -site:.gov',
  '"procurement opportunities" "foundation" "RFP" -grant -site:.gov',
  '"requests for proposals" "museum" "vendor" -site:.gov',
  '"requests for proposals" "library" "vendor" -site:.gov -city -county',
  '"request for proposals" "website redesign" nonprofit "2026"',
  '"website refresh project" "request for proposals" association',
  '"marketing and communications RFPs" nonprofit',
  '"creative marketing services" "RFP" association',
  '"vendor opportunities" "RFP" "foundation"',
  '"procurement" "RFP" "nonprofit organization"',
  '"partner with us" "open RFPs" nonprofit',
  '"RFP opportunities" "nonprofit" "vendor"',
  '"requests for proposals" "public health" nonprofit vendor',
  '"procurement opportunities" "community services" nonprofit',
  '"requests for proposals" "community action" nonprofit',
  '"vendor opportunities" "economic opportunity" nonprofit',
  '"requests for proposals" "workforce" association',
  '"requests for proposals" "conservation" nonprofit vendor',
  '"procurement opportunities" "environmental nonprofit"',
  '"requests for proposals" "arts" nonprofit vendor',
  '"vendor opportunities" "arts council" nonprofit',
  '"procurement opportunities" "health foundation"',
  '"requests for proposals" "charitable foundation" vendor',
  '"business opportunities" "foundation" "RFP"',
  '"open solicitations" nonprofit vendor',
  '"solicitation opportunities" nonprofit vendor',
  '"current solicitations" "nonprofit" "RFP"',
  '"request for qualifications" "nonprofit" vendor',
  '"RFQ" "RFP" "vendor opportunities" nonprofit',
  '"open requests for proposals" "nonprofit" "website"',
  '"request for proposals" "digital marketing" nonprofit',
  '"request for proposals" "web development" nonprofit',
  '"request for proposals" "CMS" nonprofit',
  '"request for proposals" "WordPress" nonprofit',
  '"request for proposals" "accessibility" nonprofit website',
  '"request for proposals" "technical support" "website" nonprofit',
  '"current RFPs" "association" "website"',
  '"current RFPs" "foundation" "website"',
  '"current RFPs" "nonprofit" "website"',
];

const blockedHostParts = [
  ".gov", ".edu", "sam.gov", "bidnet", "demandstar", "bonfirehub", "planetbids",
  "opengov", "rfpmart", "highergov", "findrfp", "instantmarkets", "govtribe",
  "facebook.com", "instagram.com", "linkedin.com", "reddit.com", "rfpdb.com",
  "wikipedia.org", "youtube.com", "finalsite.net", "revize.com",
];

const blockedTextSignals = [
  "school district", "public schools", "city of ", "county of ", "town of ", "borough",
  "municipal", "police department", "fire department", "department of transportation",
  "invitation to bid", "construction bid", "public works", "e-rate", "student transportation",
  "food service", "janitorial", "snow removal",
];

const rfpSignals = [
  "request for proposals", "requests for proposals", "request for proposal", "rfp",
  "vendor opportunities", "procurement opportunities", "business opportunities",
  "open rfps", "current rfps", "solicitations", "request for qualifications", "rfq",
  "request for information", "rfi",
];

const organizationSignals = [
  "nonprofit", "non-profit", "foundation", "association", "institute", "museum",
  "council", "coalition", "center", "centre", "chamber", "library", "organization",
  "501(c)(3)", "charitable", "public health", "community",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function homepageFromUrl(value: string) {
  const url = new URL(value);
  return `${url.protocol}//${url.hostname.replace(/^www\./, "")}`;
}

function titleCaseHost(hostname: string) {
  return hostname
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isBlockedUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    if (blockedHostParts.some((part) => host.includes(part) || value.toLowerCase().includes(part))) return true;
    if (/\.(pdf|docx?|xlsx?)(?:$|\?)/i.test(value)) return true;
    if (path.includes("/wp-content/uploads/") && !path.includes("rfp")) return true;
    return false;
  } catch {
    return true;
  }
}

async function searchBrave(query: string) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "20");
  url.searchParams.set("safesearch", "moderate");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("country", "US");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
  });
  if (response.status === 429) {
    await sleep(2500);
    return [];
  }
  if (!response.ok) return [];
  const payload = await response.json();
  return (payload.web?.results ?? []).map((item: { title?: string; url: string; description?: string }) => ({
    title: item.title ?? item.url,
    url: item.url,
    snippet: item.description ?? "",
  }));
}

async function searchGoogle(query: string) {
  if (!process.env.GOOGLE_CSE_API_KEY || !process.env.GOOGLE_CSE_ID) return [];
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  for (const start of [1, 11, 21]) {
    const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
    url.searchParams.set("key", process.env.GOOGLE_CSE_API_KEY);
    url.searchParams.set("cx", process.env.GOOGLE_CSE_ID);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "10");
    url.searchParams.set("start", String(start));
    const response = await fetch(url);
    if (response.status === 403 || response.status === 429) {
      const text = await response.text();
      console.warn(`Google CSE unavailable (${response.status}): ${text.slice(0, 240)}`);
      break;
    }
    if (!response.ok) break;
    const payload = await response.json();
    results.push(...(payload.items ?? []).map((item: { title?: string; link: string; snippet?: string }) => ({
      title: item.title ?? item.link,
      url: item.link,
      snippet: item.snippet ?? "",
    })));
    if (!payload.items?.length) break;
    await sleep(300);
  }
  return results;
}

async function searchTavily(query: string) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      topic: "general",
      max_results: 20,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      include_domains: [],
      exclude_domains: ["gov", "sam.gov", "bidnetdirect.com", "demandstar.com", "planetbids.com", "procurement.opengov.com"],
      time_range: "year",
    }),
  });
  if (response.status === 429 || response.status === 432 || response.status === 433) {
    await sleep(2500);
    return [];
  }
  if (!response.ok) return [];
  const payload = await response.json();
  return (payload.results ?? []).map((item: { title?: string; url: string; content?: string }) => ({
    title: item.title ?? item.url,
    url: item.url,
    snippet: item.content ?? "",
  }));
}

async function fetchPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html")) return null;
    const html = await response.text();
    const $ = cheerio.load(html);
    $("script,style,noscript,nav,footer").remove();
    const title = $("title").text().trim() || $("h1").first().text().trim();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 12000);
    return { title, text };
  } catch {
    return null;
  }
}

function inferCategory(text: string, hostname: string) {
  const lowered = `${text} ${hostname}`.toLowerCase();
  if (lowered.includes("foundation")) return "Foundation";
  if (lowered.includes("association")) return "Association";
  if (lowered.includes("museum")) return "Museum";
  if (lowered.includes("public health") || lowered.includes("health")) return "Health nonprofit";
  if (lowered.includes("chamber")) return "Chamber / business nonprofit";
  if (lowered.includes("library")) return "Library";
  if (lowered.includes("education")) return "Nonprofit education";
  return "US organization";
}

async function validateCandidate(input: { title: string; url: string; snippet: string }): Promise<Candidate | null> {
  const normalized = normalizeUrl(input.url);
  if (!normalized || isBlockedUrl(normalized)) return null;

  const page = await fetchPage(normalized);
  if (!page) return null;

  const url = new URL(normalized);
  const combined = `${input.title} ${input.snippet} ${page.title} ${page.text} ${normalized}`.toLowerCase();
  if (blockedTextSignals.some((signal) => combined.includes(signal))) return null;
  if (!rfpSignals.some((signal) => combined.includes(signal))) return null;
  if (!organizationSignals.some((signal) => combined.includes(signal))) return null;
  if (!/(united states|u\.s\.| usa |new york|california|texas|washington|florida|illinois|massachusetts|ohio|pennsylvania|colorado|virginia|maryland|north carolina|south carolina|georgia|oregon|minnesota|wisconsin|michigan|arizona|new jersey|connecticut|tennessee|alabama|louisiana|missouri|kansas|iowa|idaho|nevada|utah|maine|vermont|rhode island|delaware|district of columbia|washington, dc|\.org|\.com)/i.test(combined)) return null;

  const website = homepageFromUrl(normalized);
  const name = page.title
    ?.replace(/\s[-|•].*$/, "")
    .replace(/^(RFP|Requests? for Proposals?|Procurement Opportunities|Vendor Opportunities)\s*[-|:]?\s*/i, "")
    .trim() || titleCaseHost(url.hostname);

  return {
    name: name.length > 4 ? name.slice(0, 120) : titleCaseHost(url.hostname),
    website,
    rfpUrl: normalized,
    category: inferCategory(combined, url.hostname),
    notes: `Discovered by automated US RFP/vendor page search. Signals: ${rfpSignals.filter((signal) => combined.includes(signal)).slice(0, 4).join(", ")}.`,
  };
}

async function main() {
  const existing = await db.targetOrganization.findMany({ select: { website: true, rfpUrl: true } });
  const seenUrls = new Set(existing.flatMap((target) => [target.website, target.rfpUrl ?? ""]).filter(Boolean));
  const candidateMap = new Map<string, Candidate>();
  let searched = 0;
  let rawResults = 0;
  let validated = 0;

  for (const query of searchQueries) {
    if ((await db.targetOrganization.count()) + candidateMap.size >= TARGET_COUNT) break;
    searched += 1;
    const googleResults = await searchGoogle(query);
    const results = googleResults.length ? googleResults : [...await searchBrave(query), ...await searchTavily(query)];
    rawResults += results.length;
    for (const result of results) {
      const normalized = normalizeUrl(result.url);
      if (!normalized || seenUrls.has(normalized) || candidateMap.has(normalized) || isBlockedUrl(normalized)) continue;
      const candidate = await validateCandidate({ ...result, url: normalized });
      if (!candidate) continue;
      validated += 1;
      candidateMap.set(candidate.rfpUrl, candidate);
      seenUrls.add(candidate.rfpUrl);
      seenUrls.add(candidate.website);
      if ((await db.targetOrganization.count()) + candidateMap.size >= TARGET_COUNT) break;
    }
    console.log(JSON.stringify({ query: searched, rawResults, candidates: candidateMap.size, validated }));
    await sleep(1200);
  }

  const candidates = [...candidateMap.values()];
  if (!DRY_RUN) {
    for (const candidate of candidates) {
      await db.targetOrganization.upsert({
        where: { website: candidate.website },
        update: {
          name: candidate.name,
          rfpUrl: candidate.rfpUrl,
          category: candidate.category,
          country: "United States",
          active: true,
          priority: 5,
          notes: candidate.notes,
        },
        create: {
          ...candidate,
          country: "United States",
          active: true,
          priority: 5,
        },
      });
    }
  }

  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    searchedQueries: searched,
    rawResults,
    discovered: candidates.length,
    totalTargets: await db.targetOrganization.count(),
    activeTargets: await db.targetOrganization.count({ where: { active: true } }),
    sample: candidates.slice(0, 20),
  }, null, 2));
}

main().finally(async () => db.$disconnect());
