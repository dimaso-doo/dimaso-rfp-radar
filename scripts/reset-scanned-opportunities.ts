import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const result = await db.opportunity.deleteMany({
    where: {
      OR: [
        { sourceId: { not: null } },
        { url: { contains: "example.org" } },
        { url: { contains: "metro.gov" } },
      ],
    },
  });
  console.log(`Removed ${result.count} scanned or demo opportunities.`);
}

main().finally(() => db.$disconnect());
