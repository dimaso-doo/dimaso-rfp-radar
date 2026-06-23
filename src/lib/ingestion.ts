import * as cheerio from "cheerio";
import { createRequire } from "module";
import { scoreOpportunity } from "./scoring";

export const EXCLUSIONS = '-site:.gov -site:sam.gov -"school district"';
const EXCLUDED_DOMAINS = ["gov", "sam.gov", "usa.gov", "bidnetdirect.com", "bonfirehub.com", "planetbids.com", "demandstar.com", "procurement.opengov.com", "rfpmart.com", "highergov.com", "findrfp.com", "thebiddaily.com", "instagram.com", "facebook.com", "federalregister.gov", "liveblog365.com", "halvolink.liveblog365.com", "7f.liveblog365.com"];
export type SearchResult = { title: string; url: string; snippet: string };
export type AssessedSearchResult = SearchResult & {
  accepted: boolean;
  category: string;
  organization: string;
  deadline: Date | null;
  score: ReturnType<typeof scoreOpportunity>;
  rejectionReason?: string;
};

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));
const require = createRequire(import.meta.url);
const parsePdf = require("pdf-parse/lib/pdf-parse.js") as (bytes: Buffer) => Promise<{ text: string }>;
let braveRequestQueue: Promise<void> = Promise.resolve();
let lastBraveRequestAt = 0;

function queuedBraveFetch(url: URL, headers: Record<string, string>) {
  const task = braveRequestQueue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastBraveRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastBraveRequestAt = Date.now();
    let response = await fetch(url, { headers, cache: "no-store" });
    if (response.status === 429) {
      const retryAfter = Math.max(1, Number(response.headers.get("retry-after") ?? 2));
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      lastBraveRequestAt = Date.now();
      response = await fetch(url, { headers, cache: "no-store" });
    }
    return response;
  });
  braveRequestQueue = task.then(() => undefined, () => undefined);
  return task;
}

export function extractDeadline(text: string) {
  const monthNames = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
  const phrase = "(?:deadline[^:]{0,45}|submission deadline|proposal deadline|(?:proposals?|responses?|submissions?) (?:are )?due(?: by)?|(?:proposals?|responses?|submissions?) must be received by|submit(?:ted|sions?)?[^:]{0,25}by)";
  const match = text.match(new RegExp(`${phrase}[:\\s-]*(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s*)?(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,]?\\s+(20\\d{2}))?`, "i"));
  const numeric = text.match(new RegExp(`${phrase}[:\\s-]*(\\d{1,2})[\\/-](\\d{1,2})[\\/-](20\\d{2})`, "i"));
  if (!match && !numeric) return null;
  const inferredYear = text.match(/\b(20\d{2})\b/)?.[1] ?? String(new Date().getFullYear());
  const parsed = match
    ? new Date(`${match[1]} ${match[2]}, ${match[3] ?? inferredYear} 23:59:59`)
    : new Date(`${numeric![1]}/${numeric![2]}/${numeric![3]} 23:59:59`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildBraveQuery(query: string, pdfOnly = false) {
  const trimmed = query.trim();
  const advancedQuery = /(?:^|\s)(?:OR|AND)\s|\(|\)|"|\b(?:site|filetype|intitle|inurl):|(?:^|\s)-\S+/i.test(trimmed);
  if (advancedQuery) {
    return `${trimmed}${pdfOnly && !/\bfiletype:pdf\b/i.test(trimmed) ? " filetype:pdf" : ""}`;
  }
  const pdfFilter = pdfOnly ? " filetype:pdf" : "";
  if (/\brfp\b/i.test(trimmed)) {
    const service = trimmed.replace(/\brfp\b/gi, "").trim();
    return `"${service || trimmed}" (RFP OR "request for proposals" OR "request for proposal")${pdfFilter} ${EXCLUSIONS}`;
  }
  return `"${trimmed}" (RFP OR "request for proposals" OR "request for proposal" OR "seeking proposals" OR "accepting proposals")${pdfFilter} ${EXCLUSIONS}`;
}

function buildTavilyQuery(query: string, pdfOnly = false) {
  const braveLikeQuery = buildBraveQuery(query, pdfOnly);
  return braveLikeQuery.replace(/\s-site:[^\s]+/gi, "").replace(/\s+/g, " ").trim();
}

function tavilyDateParams(dateRestrict?: string | null) {
  if (!dateRestrict) return { time_range: "year" };
  const normalized = dateRestrict.toLowerCase();
  const ranges: Record<string, string> = { pd: "day", pw: "week", pm: "month", py: "year", d: "day", w: "week", m: "month", y: "year" };
  if (ranges[normalized]) return { time_range: ranges[normalized] };
  const months = normalized.match(/^m(\d{1,2})$/)?.[1];
  if (!months) return { time_range: "year" };
  const end = new Date();
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - Number(months));
  return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) };
}

export function assessSearchResult(result: SearchResult): AssessedSearchResult {
  const text = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
  const title = result.title.toLowerCase();
  const webSignals = ["website", "wordpress", "drupal", "cms", "content management", "front-end platform", "web application", "web design", "web development", "web accessibility", "wcag", "technical seo", "hosting support", "digital platform"];
  const intentSignals = ["rfp", "request for proposal", "request for proposals", "accepting proposals", "seeking proposals", "seeking an agency", "looking for an agency", "vendor needed", "agency partner", "support partner"];
  const blockedSignals = [".gov", "sam.gov", ".edu/", "school district", "public schools", "public works", "bid bond", "performance bond", "sam registration", "uei", "cage code", "government contractor", "government rfp", "government bids", "open doe solicitations", "county ", "city of ", "township", "borough", "municipal", "state workforce agencies", "sfusd", "official website of"];
  const blockedDomains = ["rfpmart.com", "rfpschoolwatch.com", "highergov.com", "findrfp.com", "bidnet.com", "infohub.nyced.org", "civiciq.com", "rfpdb.com", "reddit.com", "instantmarkets.com", "govtribe.com", "upscalemethod.com", "thebiddaily.com", "coderfy.com", "cityof", "liveblog365.com"];
  const editorialSignals = ["what is ", "how to ", "step-by-step", " guide", "template", "sample", " examples", " answers to ", "questions note", " tips", "strategies", "course 101", "everything you need to know", "writing an rfp", "free website", "posting/disseminating", "get access to"];
  const titleHasWebScope = includesAny(title, webSignals);
  const titleHasDirectIntent = includesAny(title, intentSignals);
  const genericRfpTitle = /^(request for proposals?|rfp\s*[:#-])/i.test(result.title.trim());
  const currentYear = new Date().getFullYear();
  const titleYears = [...title.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  const deadline = extractDeadline(`${result.title} ${result.snippet}`);
  const score = scoreOpportunity({ url: result.url, text: `${result.title} ${result.snippet}`, deadline });

  let rejectionReason: string | undefined;
  if (blockedDomains.some((domain) => text.includes(domain))) rejectionReason = "RFP aggregator or public procurement portal";
  else if (includesAny(text, blockedSignals)) rejectionReason = "Government, education procurement, or bonding content";
  else if (includesAny(title, editorialSignals)) rejectionReason = "Editorial, template, or instructional content";
  else if (titleYears.length > 0 && titleYears.every((year) => year < currentYear)) rejectionReason = "Clearly outdated opportunity";
  else if (!includesAny(text, webSignals)) rejectionReason = "No web-services scope detected";
  else if (!includesAny(text, intentSignals) && !genericRfpTitle) rejectionReason = "No active proposal intent detected";
  else if (!titleHasWebScope && !genericRfpTitle && !titleHasDirectIntent) rejectionReason = "Web-services scope is not clear in the result title";
  else if (score.score < 20) rejectionReason = "Fit score below minimum threshold";

  let category = "Website services";
  if (includesAny(text, ["wordpress", "drupal", "cms", "content management"])) category = "WordPress / CMS";
  else if (includesAny(text, ["accessibility", "wcag"])) category = "Accessibility";
  else if (includesAny(text, ["maintenance", "support partner", "hosting support"])) category = "Website maintenance";
  else if (includesAny(text, ["redesign", "replatform", "digital platform"])) category = "Website redesign";
  else if (includesAny(text, ["development", "web design"])) category = "Website development";
  else if (includesAny(text, ["seo"])) category = "SEO";

  let organization = "Unknown organization";
  try {
    const hostname = new URL(result.url).hostname.replace(/^www\./, "");
    organization = hostname.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {}

  return { ...result, accepted: !rejectionReason, category, organization, deadline, score, rejectionReason };
}

function braveFreshness(dateRestrict?: string | null) {
  if (!dateRestrict) return "py";
  const normalized = dateRestrict.toLowerCase();
  if (["pd", "pw", "pm", "py"].includes(normalized)) return normalized;
  const months = normalized.match(/^m(\d{1,2})$/)?.[1];
  if (!months) return "py";
  const end = new Date();
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - Number(months));
  return `${start.toISOString().slice(0, 10)}to${end.toISOString().slice(0, 10)}`;
}

async function braveSearch(query: string, pdfOnly = false, dateRestrict?: string | null): Promise<SearchResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", buildBraveQuery(query, pdfOnly));
  url.searchParams.set("count", pdfOnly ? "10" : "20");
  url.searchParams.set("safesearch", "moderate");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("freshness", braveFreshness(dateRestrict));
  const response = await queuedBraveFetch(url, { Accept: "application/json", "X-Subscription-Token": key });
  if (response.status === 402) throw new Error("Brave Search billing/quota problem (HTTP 402). Check the Brave API plan, card, or monthly quota.");
  if (response.status === 429) throw new Error("Brave Search rate limit reached (HTTP 429). Try again later or reduce active terms.");
  if (!response.ok) throw new Error(`Brave Search failed: HTTP ${response.status}`);
  const payload = await response.json();
  return (payload.web?.results ?? []).map((item: { title: string; url: string; description?: string }) => ({ title: item.title, url: item.url, snippet: item.description ?? "" }));
}

async function tavilySearch(query: string, pdfOnly = false, dateRestrict?: string | null, includeDomains?: string[]): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    cache: "no-store",
    body: JSON.stringify({
      query: buildTavilyQuery(query, pdfOnly),
      search_depth: "basic",
      topic: "general",
      max_results: pdfOnly ? 8 : 12,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      include_usage: true,
      exclude_domains: EXCLUDED_DOMAINS,
      ...(includeDomains?.length ? { include_domains: includeDomains } : {}),
      ...tavilyDateParams(dateRestrict),
    }),
  });
  if (response.status === 401 || response.status === 403) throw new Error(`Tavily authentication failed (HTTP ${response.status}). Check TAVILY_API_KEY.`);
  if (response.status === 429) throw new Error("Tavily rate limit or monthly credits reached (HTTP 429).");
  if (response.status === 432 || response.status === 433) throw new Error(`Tavily usage limit reached (HTTP ${response.status}). Check Tavily plan/credits.`);
  if (!response.ok) throw new Error(`Tavily Search failed: HTTP ${response.status}`);
  const payload = await response.json();
  return (payload.results ?? []).map((item: { title?: string; url: string; content?: string }) => ({ title: item.title ?? item.url, url: item.url, snippet: item.content ?? "" }));
}

const TARGET_DISCOVERY_TERMS = [
  "rfp", "request-for-proposal", "request-for-proposals", "requests-for-proposals",
  "proposal", "proposals", "procurement", "vendor", "vendors", "bid", "bids",
  "opportunities", "solicitations", "tenders",
];

const TARGET_COMMON_PATHS = [
  "/rfp", "/rfps", "/request-for-proposal", "/request-for-proposals", "/requests-for-proposals",
  "/procurement", "/purchasing", "/vendors", "/vendor-opportunities", "/business-opportunities",
  "/bid-opportunities", "/bids", "/solicitations", "/tenders", "/about/procurement", "/about/vendors",
];

const targetHeaders = { "User-Agent": "Dimaso-RFP-Radar/1.0 (+private opportunity research)" };

function sameDomain(url: string, domain: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

function looksLikeTargetDiscoveryUrl(url: string, label = "") {
  const text = `${url} ${label}`.toLowerCase();
  return TARGET_DISCOVERY_TERMS.some((term) => text.includes(term));
}

async function fetchDiscoveryDocument(url: string) {
  try {
    const response = await fetch(url, { headers: targetHeaders, redirect: "follow", signal: AbortSignal.timeout(9000), cache: "no-store" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("xml")) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function discoverTargetUrls(domain: string, seedUrls: string[] = []): Promise<SearchResult[]> {
  const bases = [`https://${domain}`, `http://${domain}`];
  const found = new Map<string, SearchResult>();
  const add = (url: string, title = "Potential RFP/vendor page", snippet = "") => {
    try {
      const normalized = new URL(url).toString().replace(/\/$/, "");
      if (sameDomain(normalized, domain)) found.set(normalized, { title, url: normalized, snippet });
    } catch {}
  };

  for (const seedUrl of seedUrls) add(seedUrl, "Verified RFP/vendor page", "Added from target organization watchlist");

  for (const base of bases) {
    if (!seedUrls.length) {
      for (const path of TARGET_COMMON_PATHS) add(`${base}${path}`, `Potential RFP/vendor page: ${path}`, "Direct target-site discovery");
    }

    const sitemap = await fetchDiscoveryDocument(`${base}/sitemap.xml`);
    if (sitemap) {
      for (const match of sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
        const url = match[1].trim();
        if (looksLikeTargetDiscoveryUrl(url)) add(url, "Sitemap RFP/vendor candidate", "Found in target sitemap");
      }
    }

    const home = await fetchDiscoveryDocument(base);
    if (home) {
      const $ = cheerio.load(home);
      $("a[href]").each((_, element) => {
        const href = $(element).attr("href");
        const label = $(element).text().replace(/\s+/g, " ").trim();
        if (!href || !looksLikeTargetDiscoveryUrl(href, label)) return;
        try {
          add(new URL(href, base).toString(), label || "Target-site RFP/vendor link", `Linked from homepage: ${label}`.slice(0, 300));
        } catch {}
      });
    }

    if (found.size) break;
  }

  const checks = await Promise.allSettled([...found.values()].slice(0, 30).map(async (result) => await isPublicUrlAvailable(result.url) ? result : null));
  return checks.flatMap((check) => check.status === "fulfilled" && check.value ? [check.value] : []).slice(0, 12);
}

export async function searchTargetDomain(domain: string, seedUrls: string[] = []) {
  const queries = [
    `("request for proposals" OR RFP) ("website redesign" OR "website development" OR "website maintenance" OR "web design" OR CMS OR WordPress)`,
    `("seeking proposals" OR "qualified vendors" OR "qualified firms") ("website" OR "web development" OR "web design" OR CMS)`,
    `("proposals due" OR "submission deadline" OR "must be received by") ("website" OR WordPress OR CMS OR "digital platform")`,
    `("request for proposal" OR RFP) ("ongoing website support" OR "website maintenance" OR "hosting support" OR "accessibility")`,
  ];
  const directResults = await discoverTargetUrls(domain, seedUrls);
  const tavilyResults = await Promise.allSettled(queries.map((query) => tavilySearch(query, false, "y", [domain])));
  const searchResults = tavilyResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  return [...new Map([...directResults, ...searchResults].map((result) => [result.url, result])).values()];
}

async function legacyGoogleSearch(query: string): Promise<SearchResult[]> {
  if (!process.env.GOOGLE_CSE_API_KEY || !process.env.GOOGLE_CSE_ID) return [];
  const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
  url.searchParams.set("key", process.env.GOOGLE_CSE_API_KEY);
  url.searchParams.set("cx", process.env.GOOGLE_CSE_ID);
  url.searchParams.set("q", `${query} ${EXCLUSIONS}`);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Google search failed: ${response.status}`);
  const payload = await response.json();
  return (payload.items ?? []).map((item: { title: string; link: string; snippet: string }) => ({ title: item.title, url: item.link, snippet: item.snippet }));
}

export async function searchWeb(query: string, dateRestrict?: string | null) {
  const provider = process.env.TAVILY_API_KEY ? tavilySearch : process.env.BRAVE_SEARCH_API_KEY ? braveSearch : null;
  if (!provider) return legacyGoogleSearch(query);
  const general = await provider(query, false, dateRestrict);
  if (/\bfiletype:pdf\b/i.test(query)) return general;
  const pdfs = await provider(query, true, dateRestrict);
  return [...new Map([...general, ...pdfs].map((result) => [result.url, result])).values()];
}

export async function isPublicUrlAvailable(url: string) {
  const headers = { "User-Agent": "Dimaso-RFP-Radar/1.0 (+private opportunity research)" };
  try {
    const head = await fetch(url, { method: "HEAD", headers, redirect: "follow", signal: AbortSignal.timeout(8000), cache: "no-store" });
    if ([404, 410, 451].includes(head.status) || head.status >= 500) return false;
    if (head.ok && (head.headers.get("content-type") ?? "").includes("application/pdf")) return true;
    if (![403, 405].includes(head.status) && !head.ok) return false;
  } catch {}
  try {
    const response = await fetch(url, { headers: { ...headers, Range: "bytes=0-1023" }, redirect: "follow", signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) return false;
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html")) return true;
    const body = (await response.text()).toLowerCase();
    return !/(page not found|404 not found|not found<\/title>|the requested url was not found|doesn.t exist|access denied|forbidden)/i.test(body);
  } catch {
    return false;
  }
}

export async function extractPublicPage(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "Dimaso-RFP-Radar/1.0 (+private opportunity research)" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("application/pdf") || /\.pdf(?:\?|$)/i.test(url)) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 15_000_000) throw new Error("PDF is larger than 15 MB");
    const parsed = await parsePdf(bytes);
    return { text: parsed.text.replace(/\s+/g, " ").trim().slice(0, 150000), documents: [url] };
  }
  if (!type.includes("text/html")) return { text: "", documents: [url] };
  const $ = cheerio.load(await response.text());
  $("script,style,noscript,nav,footer").remove();
  const documents: string[] = [];
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (href && /\.(pdf|docx?)(\?|$)/i.test(href)) try { documents.push(new URL(href, url).toString()); } catch {}
  });
  let text = $("body").text().replace(/\s+/g, " ").trim();
  const uniqueDocuments = [...new Set(documents)];
  const firstPdf = uniqueDocuments.find((document) => /\.pdf(?:\?|$)/i.test(document));
  if (firstPdf) {
    try {
      const pdfResponse = await fetch(firstPdf, { headers: { "User-Agent": "Dimaso-RFP-Radar/1.0 (+private opportunity research)" }, signal: AbortSignal.timeout(12000) });
      const length = Number(pdfResponse.headers.get("content-length") ?? 0);
      if (pdfResponse.ok && (!length || length <= 15_000_000)) {
        const bytes = Buffer.from(await pdfResponse.arrayBuffer());
        if (bytes.length <= 15_000_000) {
          const parsed = await parsePdf(bytes);
          text += ` ${parsed.text}`;
        }
      }
    } catch {}
  }
  return { text: text.replace(/\s+/g, " ").trim().slice(0, 150000), documents: uniqueDocuments };
}

export async function ingestUrl(url: string) {
  const extracted = await extractPublicPage(url);
  return { ...extracted, score: scoreOpportunity({ url, text: extracted.text }) };
}
