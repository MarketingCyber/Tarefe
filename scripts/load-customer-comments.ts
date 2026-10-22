// Loads the five real customer comments (src/lib/customer-comments.ts) into the Testimonial table, which feeds
// the homepage carousel and the electricity / gas pages. Safe to run again: rows have fixed ids and an existing
// row (possibly edited in /ops/testimonials since) is left alone.
//
//   npx tsx scripts/load-customer-comments.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CUSTOMER_COMMENTS } from "../src/lib/customer-comments";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  for (const [i, c] of CUSTOMER_COMMENTS.entries()) {
    await prisma.testimonial.upsert({
      where: { id: `customer-${c.id}` },
      update: {},
      create: {
        id: `customer-${c.id}`,
        customerName: c.name.fa,
        customerNameLatin: c.name.de,
        quoteFa: c.quote.fa,
        quoteDe: c.quote.de,
        quoteRu: c.quote.ru,
        serviceLabel: c.title.fa,
        serviceLabelDe: c.title.de,
        serviceLabelRu: c.title.ru,
        rating: null,
        consentNote: "Real customer comment, supplied by the site owner on 2026-10-22. German and Russian texts are translations. Written consent from the customer is not recorded here.",
        order: i,
        published: true,
      },
    });
    console.log("ok:", c.name.fa);
  }
}

main().finally(() => prisma.$disconnect());
