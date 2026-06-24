import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const targets = [
  {
    name: "CDC Foundation",
    website: "https://www.cdcfoundation.org",
    rfpUrl: "https://www.cdcfoundation.org/request-for-proposals",
    category: "Foundation",
    notes: "Public Requests for Proposals page.",
  },
  {
    name: "Bush Foundation",
    website: "https://www.bushfoundation.org",
    rfpUrl: "https://www.bushfoundation.org/other-work-opportunities/",
    category: "Foundation",
    notes: "Public vendor / other work opportunities page.",
  },
  {
    name: "The Other Ones Foundation",
    website: "https://toofound.org",
    rfpUrl: "https://toofound.org/business-opportunities/",
    category: "Foundation",
    notes: "Public business opportunities page with RFP/RFB process.",
  },
  {
    name: "Alliance of Community Assistance Ministries",
    website: "https://acamweb.org",
    rfpUrl: "https://acamweb.org/funding-vendor-opportunities/",
    category: "Nonprofit",
    notes: "Public funding/vendor opportunities page.",
  },
  {
    name: "ECHOS Houston",
    website: "https://echoshouston.org",
    rfpUrl: "https://echoshouston.org/vendor-opportunities/",
    category: "Nonprofit",
    notes: "Public vendor opportunities page.",
  },
  {
    name: "United Service Organizations (USO)",
    website: "https://www.uso.org",
    rfpUrl: "https://www.uso.org/about/procurement-opportunities",
    category: "Nonprofit",
    notes: "Public procurement opportunities page.",
  },
  {
    name: "ICMA",
    website: "https://icma.org",
    rfpUrl: "https://icma.org/requests-for-proposals",
    category: "Association",
    notes: "Public requests for proposals page.",
  },
  {
    name: "ICANN",
    website: "https://www.icann.org",
    rfpUrl: "https://www.icann.org/en/news/rfps",
    category: "Nonprofit",
    notes: "Public RFP news page.",
  },
  {
    name: "Lincolnwood Public Library",
    website: "https://www.lincolnwoodlibrary.org",
    rfpUrl: "https://www.lincolnwoodlibrary.org/rfps",
    category: "Library",
    notes: "Public requests for proposals page.",
  },
  {
    name: "Mark Twain House & Museum",
    website: "https://marktwainhouse.org",
    rfpUrl: "https://marktwainhouse.org/requests-for-proposals-rfps/",
    category: "Museum",
    notes: "Public RFP page.",
  },
  {
    name: "IBTTA",
    website: "https://www.ibtta.org",
    rfpUrl: "https://www.ibtta.org/business-opportunities",
    category: "Association",
    notes: "Public business opportunities page.",
  },
  {
    name: "Kaplun Foundation",
    website: "https://www.kaplunfoundation.org",
    rfpUrl: "https://www.kaplunfoundation.org/rfp",
    category: "Foundation",
    notes: "Public RFP page.",
  },
  {
    name: "Public Health Institute",
    website: "https://www.phi.org",
    rfpUrl: "https://www.phi.org/work-with-us/rfp-vendor-opportunities/",
    category: "Nonprofit",
    notes: "Public RFP & Vendor Opportunities page.",
  },
  {
    name: "AVANCE",
    website: "https://www.avance.org",
    rfpUrl: "https://www.avance.org/contact/procurement/",
    category: "Nonprofit",
    notes: "Public procurement page for open RFP opportunities.",
  },
  {
    name: "Association of Public Health Laboratories",
    website: "https://aphl.org",
    rfpUrl: "https://aphl.org/resources/for-organizations/rfp",
    category: "Association",
    notes: "Public requests for proposals and funding opportunities page.",
  },
  {
    name: "National Forest Foundation",
    website: "https://www.nationalforests.org",
    rfpUrl: "https://www.nationalforests.org/requests-for-proposals/",
    category: "Foundation",
    notes: "Public contracting and procurement opportunities page.",
  },
  {
    name: "Urban League of Broward County",
    website: "https://www.ulbroward.org",
    rfpUrl: "https://www.ulbroward.org/procurement",
    category: "Nonprofit",
    notes: "Public procurement/RFP page.",
  },
  {
    name: "Mount Rogers Community Services",
    website: "https://www.mountrogers.org",
    rfpUrl: "https://www.mountrogers.org/procurement-opportunities/",
    category: "Nonprofit",
    notes: "Public procurement opportunities page.",
  },
  {
    name: "Advance Central PA",
    website: "https://advancecentralpa.org",
    rfpUrl: "https://advancecentralpa.org/about-us/public-notices/",
    category: "Nonprofit",
    notes: "Public notices page with procurement/RFP contracting notices.",
  },
  {
    name: "Associated Universities / NRAO",
    website: "https://info.nrao.edu",
    rfpUrl: "https://info.nrao.edu/oas/cap/open-rfps",
    category: "Nonprofit research",
    notes: "Public open RFP/RFI/sources sought page.",
  },
  {
    name: "American Forests",
    website: "https://www.americanforests.org",
    rfpUrl: "https://www.americanforests.org/procurement-opportunities/",
    category: "Nonprofit",
    notes: "Public procurement opportunities page where vendors can download RFPs.",
  },
  {
    name: "Fresno Economic Opportunities Commission",
    website: "https://fresnoeoc.org",
    rfpUrl: "https://fresnoeoc.org/rfp/",
    category: "Nonprofit",
    notes: "Public RFP page with open RFPs and procurement process details.",
  },
  {
    name: "Vera Institute of Justice",
    website: "https://www.vera.org",
    rfpUrl: "https://www.vera.org/get-involved/partner-with-vera",
    category: "Nonprofit",
    notes: "Public partner page linking to open RFP/RFQ proposal platform.",
  },
  {
    name: "OPERS",
    website: "https://www.opers.org",
    rfpUrl: "https://www.opers.org/about/vendor/index.shtml",
    category: "Public pension / vendor opportunities",
    notes: "Public vendor opportunities page using RFP, RFQ, RFI and related competitive models.",
  },
  {
    name: "Philadelphia Soccer 2026",
    website: "https://phillyfwc26.com",
    rfpUrl: "https://phillyfwc26.com/vendor-opportunities",
    category: "Event nonprofit / vendor opportunities",
    notes: "Public FIFA World Cup 26 Philadelphia vendor opportunities page.",
  },
  {
    name: "Alliance College-Ready Public Schools",
    website: "https://laalliance.org",
    rfpUrl: "https://laalliance.org/procurement/",
    category: "Nonprofit education",
    notes: "Public procurement and RFP page with current vendor documentation.",
  },
  {
    name: "KIPP NYC",
    website: "https://kippnyc.org",
    rfpUrl: "https://kippnyc.org/marketing-rfp/",
    category: "Nonprofit education",
    notes: "Public marketing and communications RFP page; useful for creative/digital agency monitoring.",
  },
  {
    name: "NPPGov",
    website: "https://nppgov.com",
    rfpUrl: "https://nppgov.com/open-rfps/",
    category: "Purchasing cooperative",
    notes: "Public open RFP page and vendor interest form.",
  },
  {
    name: "International Dyslexia Association",
    website: "https://dyslexiaida.org",
    rfpUrl: "https://dyslexiaida.org/ida-request-for-proposals/",
    category: "Association",
    notes: "Public RFP page for current open RFP opportunities.",
  },
  {
    name: "National Association of State Workforce Agencies",
    website: "https://www.naswa.org",
    rfpUrl: "https://www.naswa.org/partner-with-us/rfp-opportunities",
    category: "Association",
    notes: "Public RFP opportunities page; recently included creative marketing and website revamp opportunities.",
  },
  {
    name: "North American Renderers Association",
    website: "https://nara.org",
    rfpUrl: "https://nara.org/request-for-proposals/",
    category: "Association",
    notes: "Public current RFP page.",
  },
  {
    name: "American Society for Engineering Education",
    website: "https://www.asee.org",
    rfpUrl: "https://www.asee.org/about-us/Request-for-Proposals",
    category: "Association",
    notes: "Public RFP page; has included website refresh / content governance work.",
  },
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await db.reviewCandidate.deleteMany({});
  await db.opportunity.deleteMany({});
  await db.searchSource.deleteMany({});
  await db.searchProfile.deleteMany({});
  await db.targetOrganization.deleteMany({});

  for (const [index, target] of targets.entries()) {
    await db.targetOrganization.create({
      data: {
        ...target,
        country: "United States",
        active: true,
        priority: index + 1,
      },
    });
  }

  console.log(JSON.stringify({
    targets: await db.targetOrganization.count(),
    reviewCandidates: await db.reviewCandidate.count(),
    opportunities: await db.opportunity.count(),
    searchSources: await db.searchSource.count(),
  }, null, 2));
}

main().finally(async () => db.$disconnect());
