export type ScoreResult = {
  score: number;
  recommendation: "Good Fit" | "Review" | "Weak Fit" | "No-bid";
  status: string;
  reasons: string[];
};

const has = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export function scoreOpportunity(input: { url?: string; text: string; deadline?: Date | null }): ScoreResult {
  const text = `${input.url ?? ""} ${input.text}`.toLowerCase();
  const reasons: string[] = [];
  const governmentSignals = [
    ".gov", "sam.gov", "government contract", "public procurement", "school district",
    "public schools", "municipality", "city of ", "county of ", "state of ", "uei", "cage code",
    "township", "borough", "municipal",
  ];

  if (has(text, governmentSignals)) {
    return { score: 0, recommendation: "No-bid", status: "Rejected - Government", reasons: ["Government or public procurement signal"] };
  }

  let score = 0;
  const add = (points: number, label: string, terms: string[]) => {
    if (has(text, terms)) {
      score += points;
      reasons.push(`${points > 0 ? "+" : ""}${points} ${label}`);
    }
  };

  add(20, "Active RFP or partner search", ["request for proposal", "request for proposals", "rfp", "accepting proposals", "seeking proposals", "seeking an agency", "looking for an agency", "vendor needed"]);
  add(30, "Website redesign, development or maintenance", ["website redesign", "website development", "website maintenance", "web development", "web design"]);
  add(20, "WordPress or CMS support", ["wordpress", "cms support", "content management system"]);
  add(25, "Ongoing support or retainer", ["ongoing support", "maintenance partner", "support partner", "retainer", "long-term partner"]);
  add(15, "Accessibility, SEO or hosting scope", ["web accessibility", "wcag", "technical seo", "website hosting", "hosting support"]);
  add(25, "Nonprofit, association or foundation", ["nonprofit", "non-profit", "association", "foundation", "membership organization"]);
  add(20, "Private company or business", ["private company", "corporate website", "business website"]);
  add(20, "Healthcare or chamber", ["healthcare", "health network", "clinic", "chamber of commerce"]);
  add(15, "Email or online submission", ["email submission", "online submission", "submit by email", "submit proposals"]);
  add(15, "Remote work allowed", ["remote vendor", "work remotely", "no location restriction", "nationwide"]);

  if (input.deadline) {
    if (input.deadline < new Date()) {
      score -= 100;
      reasons.push("-100 Deadline passed");
    } else {
      score += 10;
      reasons.push("+10 Clear deadline");
    }
  }

  add(-80, "Local vendor only", ["local vendor only", "must be located in"]);
  add(-50, "Insurance or bonding", ["bid bond", "performance bond", "bonding requirement"]);
  add(-50, "Physical presence required", ["physical presence required", "on-site required"]);
  add(-40, "Procurement portal only", ["procurement portal only", "vendor portal only"]);

  score = Math.max(0, Math.min(100, score));
  const recommendation = score >= 70 ? "Good Fit" : score >= 40 ? "Review" : score >= 20 ? "Weak Fit" : "No-bid";
  return {
    score,
    recommendation,
    status: recommendation === "No-bid" ? "Rejected - Low fit" : "New",
    reasons,
  };
}
