/**
 * LOCAL ONLY: sample data for testing the mobile app against the laptop's database — one customer with the same
 * four sample contracts, conversations and requests as the clickable prototype. Refuses to run unless
 * DATABASE_URL points at localhost, so it can never write fake contracts into production.
 *
 *   npx tsx scripts/seed-app-sample.ts
 *
 * Then sign in to the app with app-test@tarefe.de (the code is printed in the `next dev` console).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
  console.error("Refusing to run: DATABASE_URL is not a local database.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const day = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * day);

async function main() {
  const advisorA = await prisma.user.upsert({
    where: { email: "sara.sample@tarefe.local" },
    update: {},
    create: { email: "sara.sample@tarefe.local", name: "سارا رحیمی", role: "ADVISOR" },
  });
  const advisorB = await prisma.user.upsert({
    where: { email: "omid.sample@tarefe.local" },
    update: {},
    create: { email: "omid.sample@tarefe.local", name: "امید کریمی", role: "ADVISOR" },
  });
  const customer = await prisma.user.upsert({
    where: { email: "app-test@tarefe.de" },
    update: { name: "مریم رضایی" },
    create: { email: "app-test@tarefe.de", name: "مریم رضایی", role: "CUSTOMER", locale: "fa" },
  });

  // Start clean for this one test customer so the script can be re-run.
  const old = await prisma.conversation.findMany({ where: { customerId: customer.id }, select: { id: true } });
  await prisma.message.deleteMany({ where: { conversationId: { in: old.map((c) => c.id) } } });
  await prisma.serviceRequest.deleteMany({ where: { customerId: customer.id } });
  await prisma.conversation.deleteMany({ where: { customerId: customer.id } });
  await prisma.document.deleteMany({ where: { ownerId: customer.id } });
  await prisma.contract.deleteMany({ where: { customerId: customer.id } });

  const mk = (data: { provider: string; productName: string; category: string; price: string; number: string; start: Date; end: Date; deadline: Date }) =>
    prisma.contract.create({
      data: {
        customerId: customer.id, provider: data.provider, productName: data.productName, category: data.category,
        priceMonthly: data.price, contractNumber: data.number, startDate: data.start, endDate: data.end, cancellationDeadline: data.deadline, status: "ACTIVE",
      },
    });
  const vf = await mk({ provider: "Vattenfall", productName: "ÖkoStrom24 Pur", category: "electricity", price: "58", number: "4410 2287 31", start: inDays(-690), end: inDays(40), deadline: inDays(12) });
  const swm = await mk({ provider: "Stadtwerke München", productName: "M-Erdgas Natur", category: "gas", price: "41", number: "SWM-88 120 457", start: inDays(-300), end: inDays(250), deadline: inDays(220) });
  const ba = await mk({ provider: "Barmenia", productName: "Mehr Zahn 100", category: "dental", price: "24", number: "BA-2041-956", start: inDays(-250), end: inDays(70), deadline: inDays(40) });
  await mk({ provider: "ARAG", productName: "Aktiv-Rechtsschutz", category: "legal-protection", price: "19", number: "AR-4390-185", start: inDays(-180), end: inDays(190), deadline: inDays(100) });

  const conv = (contractId: string | null, advisorId: string) => prisma.conversation.create({ data: { customerId: customer.id, contractId, advisorId } });
  const cvf = await conv(vf.id, advisorA.id);
  const cswm = await conv(swm.id, advisorA.id);
  const cba = await conv(ba.id, advisorB.id);
  await conv(null, advisorA.id);

  const msg = (conversationId: string, senderId: string, content: string, minutesAgo: number, kind: "TEXT" | "SYSTEM" = "TEXT", serviceRequestId?: string) =>
    prisma.message.create({ data: { conversationId, senderId, content, kind, serviceRequestId, createdAt: new Date(Date.now() - minutesAgo * 60000) } });

  const t1 = await prisma.serviceRequest.create({
    data: { customerId: customer.id, advisorId: advisorA.id, contractId: vf.id, conversationId: cvf.id, subjectType: "cancellation", subject: "افزایش قیمت و تغییر تعرفه", status: "UNDER_REVIEW" },
  });
  await prisma.serviceRequest.create({
    data: { customerId: customer.id, advisorId: advisorA.id, contractId: vf.id, conversationId: cvf.id, subjectType: "invoice_question", subject: "ارسال صورت‌حساب سالانه ۲۰۲۵", status: "COMPLETED", createdAt: inDays(-280) },
  });
  await msg(cvf.id, customer.id, "سلام، این نامه از Vattenfall آمده. قیمت برقم بالا می‌رود؟", 40);
  await msg(cvf.id, customer.id, `درخواست T-${t1.id.slice(-6).toUpperCase()} باز شد: افزایش قیمت و تغییر تعرفه`, 39, "SYSTEM", t1.id);
  await msg(cvf.id, advisorA.id, "سلام مریم جان. نامه را دیدم. بله، از ژانویه قیمت بالا می‌رود. خبر خوب این است که تا ۴ نوامبر می‌توانی قرارداد را فسخ کنی.", 30);
  await msg(cvf.id, advisorA.id, "اگر موافقی، فسخ و ثبت قرارداد جدید را خودمان انجام می‌دهیم. برای تو هیچ هزینه‌ای ندارد.", 28);
  await prisma.conversation.update({ where: { id: cvf.id }, data: { lastMessageAt: new Date(Date.now() - 28 * 60000), customerLastReadAt: new Date(Date.now() - 39 * 60000) } });

  await msg(cswm.id, advisorA.id, "سلام مریم جان. این گفتگو مخصوص قرارداد گاز توست. هر سوالی درباره آن داری همین‌جا بپرس.", 30 * 24 * 60);
  await prisma.conversation.update({ where: { id: cswm.id }, data: { lastMessageAt: new Date(Date.now() - 30 * 24 * 60 * 60000), customerLastReadAt: new Date() } });

  const t3 = await prisma.serviceRequest.create({
    data: { customerId: customer.id, advisorId: advisorB.id, contractId: ba.id, conversationId: cba.id, subjectType: "claim_report", subject: "بازپرداخت هزینه درمان", status: "SENT_TO_PROVIDER" },
  });
  await msg(cba.id, customer.id, "فاکتور جرم‌گیری را فرستادم.", 26 * 60);
  await msg(cba.id, customer.id, `درخواست T-${t3.id.slice(-6).toUpperCase()} باز شد: بازپرداخت هزینه درمان`, 26 * 60 - 1, "SYSTEM", t3.id);
  await msg(cba.id, advisorB.id, "فاکتور را برای Barmenia فرستادم. معمولاً تا دو هفته جواب می‌دهند و همین‌جا خبرت می‌کنم.", 25 * 60);
  await prisma.conversation.update({ where: { id: cba.id }, data: { lastMessageAt: new Date(Date.now() - 25 * 60 * 60000), customerLastReadAt: new Date(Date.now() - 26 * 60 * 60000) } });

  await prisma.document.createMany({
    data: [
      { ownerId: customer.id, contractId: vf.id, title: "قرارداد Vattenfall", type: "CONTRACT" },
      { ownerId: customer.id, contractId: vf.id, title: "صورت‌حساب سالانه ۲۰۲۵", type: "INVOICE" },
      { ownerId: customer.id, contractId: ba.id, title: "بیمه‌نامه Barmenia", type: "POLICY" },
      { ownerId: customer.id, title: "تأییدیه فسخ بیمه خودرو", type: "LETTER", uploadedByStaff: true },
    ],
  });

  // Two sample Home slides (no images, so the app shows its icon fallback). Staff replace them in /ops/app-banners.
  await prisma.appBanner.deleteMany({ where: { title: { in: ["دوستت را معرفی کن، ۱۰ یورو هدیه", "بیمه دندان: ایمپلنت هم پوشش داده می‌شود"] } } });
  await prisma.appBanner.createMany({
    data: [
      { title: "دوستت را معرفی کن، ۱۰ یورو هدیه", body: "وقتی دوستت قراردادش را امضا کند، کارت هدیه برایت فرستاده می‌شود.", ctaLabel: "کد معرفی من", target: "referral", sort: 0 },
      { title: "بیمه دندان: ایمپلنت هم پوشش داده می‌شود", body: "مشاورت بهترین بیمه را برای شرایط تو پیدا می‌کند. رایگان.", ctaLabel: "مشاوره رایگان", target: "advice:بیمه دندان", sort: 1 },
    ],
  });

  console.log("Sample app data ready for app-test@tarefe.de");
}

main().finally(() => prisma.$disconnect());
