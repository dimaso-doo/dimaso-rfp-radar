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
