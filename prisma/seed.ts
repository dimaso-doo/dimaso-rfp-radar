import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { defaultQueries } from "../src/lib/data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  for (const query of defaultQueries) {
    const existing = await db.searchSource.findFirst({ where: { query } });
    if (!existing) await db.searchSource.create({ data: { query } });
  }
}

main().finally(() => db.$disconnect());
