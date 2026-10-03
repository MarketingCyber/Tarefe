// Needed when this file runs standalone via `npm run seed` (tsx directly) —
// prisma.config.ts also loads dotenv, but only takes effect via the Prisma
// CLI's own seed integration, not a plain `tsx prisma/seed.ts` invocation.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const advisorPassword = await bcrypt.hash("Tarefe-Advisor-2026!", 10);
  const customerPassword = await bcrypt.hash("Tarefe-Customer-2026!", 10);

  const advisor = await prisma.user.upsert({
    where: { email: "advisor@tarefe.de" },
    update: {},
    create: {
      email: "advisor@tarefe.de",
      passwordHash: advisorPassword,
      name: "آرش شریفی",
      role: "ADVISOR",
      locale: "fa",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@tarefe.de" },
    update: {},
    create: {
      email: "customer@tarefe.de",
      passwordHash: customerPassword,
      name: "پوریا حسینی",
      role: "CUSTOMER",
      locale: "fa",
    },
  });

  // Dedicated fixture for the MFA E2E suite (e2e/mfa.spec.ts) — kept
  // separate from `advisor` above so the MFA tests toggling this account's
  // mfaEnabled on and off can never race with or leave stray state on the
  // plain-login tests, which assert advisor@tarefe.de has no MFA.
  const mfaTestPassword = await bcrypt.hash("Tarefe-MfaTest-2026!", 10);
  const mfaTestAdvisor = await prisma.user.upsert({
    where: { email: "mfa-test@tarefe.de" },
    update: {},
    create: {
      email: "mfa-test@tarefe.de",
      passwordHash: mfaTestPassword,
      name: "MFA Test Advisor",
      role: "ADVISOR",
      locale: "fa",
    },
  });

  // Real ADMIN account, seeded only when the actual credentials are passed
  // via env — unlike the advisor/customer accounts above (deliberately
  // simple test fixtures, documented as such), an admin password is a real
  // production credential and must never sit in plaintext in a git-tracked
  // file. No env vars set → this account is silently skipped, so the
  // default `npm run` seed of the two test accounts stays unaffected.
  let admin: { email: string } | null = null;
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    admin = await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL },
      update: {},
      create: {
        email: process.env.ADMIN_EMAIL,
        passwordHash: adminPassword,
        name: process.env.ADMIN_NAME ?? "Admin",
        role: "ADMIN",
        locale: "fa",
      },
    });
  }

  // Migrates the FAQ content that used to live hard-coded in
  // src/lib/faq-data.ts (now deleted — see src/app/ops/faq for the admin
  // UI that replaces it) into the DB, so switching the public site over to
  // reading from FaqItem loses nothing. Fixed ids make this upsert
  // idempotent across repeated `npm run seed` runs — after the first run,
  // whatever staff have since edited via /ops/faq is left alone (`update:
  // {}`), this only ever creates the row once.
  const faqSeeds = [
    {
      id: "faq-seed-1",
      questionFa: "استفاده از خدمات تعرفه چقدر هزینه دارد؟",
      questionDe: "Was kostet die Nutzung von Tarefe?",
      questionRu: "Сколько стоит использование Tarefe?",
      answerFa: "خدمات مشاوره و مقایسه تعرفه ۱۰۰٪ رایگان است. ما از طریق کمیسیون شرکت‌های طرف قرارداد تامین مالی می‌شویم، نه از شما.",
      answerDe: "Beratung und Vergleich sind bei Tarefe 100 % kostenlos. Wir finanzieren uns über Provisionen der Partnerunternehmen, nicht über Sie.",
      answerRu: "Консультации и сравнение в Tarefe на 100% бесплатны. Мы финансируемся за счёт комиссий партнёров, а не за счёт вас.",
      order: 0,
    },
    {
      id: "faq-seed-2",
      questionFa: "آیا می‌توانم قرارداد فعلی‌ام را از طریق تعرفه فسخ کنم؟",
      questionDe: "Kann ich meinen bestehenden Vertrag über Tarefe kündigen?",
      questionRu: "Могу ли я расторгнуть текущий договор через Tarefe?",
      answerFa: "بله، تیم ما نامه فسخ قانونی را آماده و برای شما ارسال می‌کند و پیگیری تا تایید نهایی را انجام می‌دهد.",
      answerDe: "Ja, unser Team erstellt und versendet das rechtsgültige Kündigungsschreiben und begleitet Sie bis zur Bestätigung.",
      answerRu: "Да, наша команда готовит и отправляет юридически действительное письмо о расторжении и сопровождает до подтверждения.",
      order: 1,
    },
    {
      id: "faq-seed-3",
      questionFa: "چقدر طول می‌کشد تا مشاور با من تماس بگیرد؟",
      questionDe: "Wie schnell meldet sich ein Berater bei mir?",
      questionRu: "Как быстро со мной свяжется консультант?",
      answerFa: "معمولا ظرف کمتر از ۳ ساعت کاری، از طریق تماس یا واتساپ با شما در ارتباط خواهیم بود.",
      answerDe: "In der Regel innerhalb von 3 Werkstunden per Anruf oder WhatsApp.",
      answerRu: "Обычно в течение 3 рабочих часов по звонку или в WhatsApp.",
      order: 2,
    },
    {
      id: "faq-seed-4",
      questionFa: "آیا شرکت‌های ارائه‌دهنده به زبان فارسی صحبت می‌کنند؟",
      questionDe: "Sprechen die Anbieter Persisch?",
      questionRu: "Говорят ли поставщики на персидском?",
      answerFa: "خیر، اما مشاوران تعرفه به فارسی با شما هستند و در تمام مکاتبات با شرکت، واسطه شما خواهند بود.",
      answerDe: "Nein, aber unsere Tarefe-Berater sprechen Persisch und übernehmen die gesamte Kommunikation mit dem Anbieter für Sie.",
      answerRu: "Нет, но консультанты Tarefe говорят на персидском и берут на себя всё общение с поставщиком.",
      order: 3,
    },
    {
      id: "faq-seed-5",
      questionFa: "آیا استفاده از My Tarefe (پرتال مشتری) هزینه دارد؟",
      questionDe: "Kostet die Nutzung von My Tarefe (Kundenportal) etwas?",
      questionRu: "Платно ли использование My Tarefe (портала клиента)?",
      answerFa: "خیر، پرتال My Tarefe برای مشتریان ما همیشه رایگان است.",
      answerDe: "Nein, das My-Tarefe-Portal ist für unsere Kunden immer kostenlos.",
      answerRu: "Нет, портал My Tarefe всегда бесплатен для наших клиентов.",
      order: 4,
    },
  ];
  for (const faq of faqSeeds) {
    await prisma.faqItem.upsert({ where: { id: faq.id }, update: {}, create: faq });
  }

  // Migrates the 4 guides that used to live hard-coded in
  // src/lib/guides-data.ts (now deleted — see src/app/ops/guides for the
  // admin UI). Bodies are mechanically converted from the old structured
  // {heading, paragraphs}[] shape into the new plain-text "## heading" +
  // blank-line-paragraph convention (see src/lib/guide-body.ts) — done via
  // a one-off script reading the original file, not retyped by hand, to
  // avoid transcription errors in the Persian/German/Russian text. Same
  // fixed-id idempotent-upsert pattern as faqSeeds.
  const guideSeeds = [
    {
      id: "guide-seed-1",
      slug: "pkv-vs-gkv",
      titleFa: "بیمه خصوصی یا دولتی؟ راهنمای انتخاب بیمه درمانی در آلمان",
      titleDe: "Privat oder gesetzlich? Ratgeber zur Krankenversicherungswahl in Deutschland",
      titleRu: "Частная или государственная? Как выбрать медстраховку в Германии",
      excerptFa: "تفاوت واقعی PKV و GKV، چه کسی اصلاً اجازه تعویض دارد، و چرا این تصمیم را نباید عجولانه گرفت.",
      excerptDe: "Der reale Unterschied zwischen PKV und GKV, wer überhaupt wechseln darf, und warum diese Entscheidung nicht überstürzt werden sollte.",
      excerptRu: "Реальная разница между PKV и GKV, кто вообще может перейти, и почему не стоит спешить с этим решением.",
      bodyFa:
        "## تفاوت اصلی چیست؟\n\nGKV (بیمه درمانی قانونی/دولتی) سیستم استانداردی است که اکثریت کارمندان و خانواده‌های آن‌ها در آن عضو هستند؛ حق بیمه بر اساس درصدی از حقوق محاسبه می‌شود، نه ریسک سلامتی فرد. PKV (بیمه درمانی خصوصی) قراردادی جداگانه با یک شرکت بیمه است که حق بیمه آن بر اساس سن، سلامتی و پوششی که انتخاب می‌کنید تعیین می‌شود — می‌تواند برای جوان‌های سالم ارزان‌تر باشد، اما این تضمینی نیست.\n\n## چه کسی اصلاً اجازه تعویض به PKV را دارد؟\n\nاین نکته مهم‌ترین بخش تصمیم است: هرکسی نمی‌تواند آزادانه به PKV برود. کارمندان فقط زمانی اجازه انتخاب PKV را دارند که درآمد ناخالص سالانه‌شان به‌طور پایدار از یک سقف مشخص (به آن Versicherungspflichtgrenze می‌گویند) بالاتر برود؛ برای سال ۲۰۲۶ این سقف ۷۷٬۴۰۰ یورو در سال (معادل ۶٬۴۵۰ یورو در ماه) است. فریلنسرها و صاحبان مشاغل معمولاً محدودیت درآمدی ندارند و می‌توانند از ابتدا PKV انتخاب کنند. این عدد هر سال تغییر می‌کند، پس همیشه رقم به‌روز را با مشاور خود بررسی کن.\n\n## چرا نباید عجولانه تصمیم گرفت؟\n\nبرخلاف GKV، بازگشت از PKV به GKV بعد از یک سن مشخص یا در شرایط خاص می‌تواند سخت یا غیرممکن باشد؛ حق بیمه PKV هم معمولاً با افزایش سن بالا می‌رود. این تصمیم باید بر اساس برنامه بلندمدت زندگی در آلمان، وضعیت شغلی و خانوادگی گرفته شود، نه فقط قیمت ماه اول.",
      bodyDe:
        "## Was ist der grundlegende Unterschied?\n\nDie GKV (gesetzliche Krankenversicherung) ist das Standardsystem, in dem die meisten Angestellten und ihre Familien versichert sind; der Beitrag richtet sich nach einem Prozentsatz des Gehalts, nicht nach dem individuellen Gesundheitsrisiko. Die PKV (private Krankenversicherung) ist ein separater Vertrag mit einem Versicherer, dessen Beitrag von Alter, Gesundheitszustand und gewähltem Leistungsumfang abhängt — für junge, gesunde Menschen kann das günstiger sein, ist aber keine Garantie.\n\n## Wer darf überhaupt in die PKV wechseln?\n\nDas ist der wichtigste Teil der Entscheidung: Nicht jeder darf frei in die PKV wechseln. Angestellte dürfen nur dann in die PKV wechseln, wenn ihr Bruttojahreseinkommen dauerhaft über einer bestimmten Grenze liegt (der sogenannten Versicherungspflichtgrenze); für 2026 liegt sie bei 77.400 € jährlich (bzw. 6.450 € monatlich). Selbstständige und Freiberufler unterliegen in der Regel keiner Einkommensgrenze und können von Anfang an PKV wählen. Diese Zahl ändert sich jährlich — prüfen Sie den aktuellen Wert immer mit Ihrem Berater.\n\n## Warum sollte man nicht überstürzt entscheiden?\n\nAnders als bei der GKV kann eine Rückkehr von der PKV in die GKV ab einem bestimmten Alter oder unter bestimmten Umständen schwierig oder unmöglich sein; auch die PKV-Beiträge steigen in der Regel mit zunehmendem Alter. Diese Entscheidung sollte auf Basis der langfristigen Lebensplanung in Deutschland, der beruflichen und familiären Situation getroffen werden — nicht nur anhand des Preises im ersten Monat.",
      bodyRu:
        "## В чём главное отличие?\n\nGKV (государственное медстрахование) — стандартная система, в которой состоит большинство сотрудников и их семей; взнос рассчитывается как процент от зарплаты, а не от индивидуального риска для здоровья. PKV (частное медстрахование) — отдельный договор со страховой компанией, взнос по которому зависит от возраста, состояния здоровья и выбранного покрытия — для молодых здоровых людей это может быть дешевле, но не гарантированно.\n\n## Кто вообще может перейти на PKV?\n\nЭто самая важная часть решения: не каждый может свободно перейти на PKV. Сотрудники могут выбрать PKV только если их годовой валовой доход стабильно превышает определённый порог (Versicherungspflichtgrenze); на 2026 год это 77 400 € в год (или 6 450 € в месяц). На самозанятых и фрилансеров обычно порог дохода не распространяется, и они могут выбрать PKV с самого начала. Эта цифра меняется каждый год — всегда уточняйте актуальное значение у консультанта.\n\n## Почему не стоит спешить с решением?\n\nВ отличие от GKV, возврат с PKV на GKV после определённого возраста или при определённых обстоятельствах может быть затруднён или невозможен; взносы PKV также обычно растут с возрастом. Это решение должно приниматься с учётом долгосрочных планов жизни в Германии, рабочей и семейной ситуации — а не только цены за первый месяц.",
      relatedCategory: "insurance",
      relatedSubcategory: "health",
      relatedProductType: "pkv",
      verifiedAt: new Date("2026-08-28"),
      sources: [
        { label: "Allianz — Versicherungspflichtgrenze 2026", url: "https://www.allianz.de/gesundheit/private-krankenversicherung/versicherungspflichtgrenze/" },
        { label: "biallo.de — Versicherungspflichtgrenze 2026", url: "https://www.biallo.de/soziales/news/neue-versicherungspflichtgrenze-2026-wer-muss-zurueck-in-die-gkv/" },
      ],
      order: 0,
    },
    {
      id: "guide-seed-2",
      slug: "switching-electricity-provider",
      titleFa: "چگونه قرارداد برق را در آلمان تغییر دهیم",
      titleDe: "So wechseln Sie Ihren Stromanbieter in Deutschland",
      titleRu: "Как сменить поставщика электроэнергии в Германии",
      excerptFa: "مراحل واقعی تعویض قرارداد برق، مدت زمان لازم، و زمانی که حق فسخ فوری داری.",
      excerptDe: "Die tatsächlichen Schritte beim Anbieterwechsel, wie lange es dauert, und wann Sie ein Sonderkündigungsrecht haben.",
      excerptRu: "Реальные шаги при смене поставщика, сколько это занимает и когда у вас есть право на досрочное расторжение.",
      bodyFa:
        "## چقدر طول می‌کشد؟\n\nبه‌طور معمول کل فرآیند تعویض بین ۴ تا ۶ هفته طول می‌کشد. طبق قانون انرژی آلمان (EnWG)، اگر ارائه‌دهنده جدید مشترک را نزد اپراتور شبکه محلی ثبت کرده باشد، این فرآیند نباید بیش از ۳ هفته طول بکشد. در تمام این مدت، برق خانه‌ات بدون هیچ قطعی وصل می‌ماند — این کار ارائه‌دهندگان است، نه چیزی که خودت باید نگرانش باشی.\n\n## مهلت فسخ عادی چقدر است؟\n\nبرای قراردادهایی که از مارس ۲۰۲۲ به بعد بسته شده‌اند، بعد از پایان دوره تعهد اولیه، فسخ با مهلت حداکثر یک ماهه امکان‌پذیر است. برخی قراردادهای قدیمی‌تر ممکن است مهلت فسخ سه‌ماهه قبل از پایان قرارداد داشته باشند — تاریخ دقیق را در قرارداد یا آخرین فاکتور خود بررسی کن.\n\n## چه زمانی حق فسخ فوری (بدون انتظار) داری؟\n\nاگر ارائه‌دهنده قیمت را افزایش دهد یا شرایط قرارداد را یک‌طرفه تغییر دهد، معمولاً حق فسخ فوری (Sonderkündigungsrecht) داری — در بسیاری موارد با مهلت فقط دو هفته‌ای. اسباب‌کشی هم معمولاً همین حق را ایجاد می‌کند، مخصوصاً اگر ارائه‌دهنده فعلی در آدرس جدید خدمات ارائه ندهد.",
      bodyDe:
        "## Wie lange dauert es?\n\nIn der Regel dauert der gesamte Wechselprozess 4 bis 6 Wochen. Nach dem Energiewirtschaftsgesetz (EnWG) darf der Wechsel höchstens 3 Wochen dauern, wenn der neue Anbieter den Kunden beim örtlichen Netzbetreiber angemeldet hat. Während der gesamten Zeit bleibt Ihr Zuhause ohne Unterbrechung mit Strom versorgt — das übernehmen die Anbieter, darum müssen Sie sich nicht selbst kümmern.\n\n## Wie lange ist die reguläre Kündigungsfrist?\n\nFür Verträge, die ab März 2022 abgeschlossen wurden, ist nach Ablauf der Mindestvertragslaufzeit eine Kündigung mit einer Frist von maximal einem Monat möglich. Manche ältere Verträge haben eine dreimonatige Kündigungsfrist vor Vertragsende — prüfen Sie das genaue Datum in Ihrem Vertrag oder Ihrer letzten Rechnung.\n\n## Wann haben Sie ein sofortiges Sonderkündigungsrecht?\n\nWenn der Anbieter die Preise erhöht oder die Vertragsbedingungen einseitig ändert, haben Sie in der Regel ein Sonderkündigungsrecht — in vielen Fällen mit einer Frist von nur zwei Wochen. Auch ein Umzug begründet in der Regel dieses Recht, insbesondere wenn der aktuelle Anbieter an der neuen Adresse nicht liefert.",
      bodyRu:
        "## Сколько это занимает?\n\nОбычно весь процесс перехода занимает от 4 до 6 недель. Согласно немецкому закону об энергетике (EnWG), переход не должен занимать более 3 недель, если новый поставщик зарегистрировал клиента у местного сетевого оператора. Всё это время электричество в доме подаётся без перерыва — этим занимаются сами поставщики, вам не нужно об этом беспокоиться.\n\n## Каков обычный срок расторжения?\n\nДля договоров, заключённых с марта 2022 года, после окончания минимального срока действия расторжение возможно с уведомлением максимум за один месяц. У некоторых более старых договоров может быть трёхмесячный срок уведомления до окончания договора — точную дату уточните в договоре или последнем счёте.\n\n## Когда у вас есть право на немедленное расторжение?\n\nЕсли поставщик повышает цены или в одностороннем порядке меняет условия договора, у вас, как правило, есть право на досрочное расторжение — во многих случаях со сроком уведомления всего две недели. Переезд также обычно даёт это право, особенно если текущий поставщик не обслуживает новый адрес.",
      relatedCategory: "energy",
      relatedSubcategory: "electricity",
      relatedProductType: null,
      verifiedAt: new Date("2026-08-28"),
      sources: [
        { label: "Verivox — Kündigungsfrist Stromvertrag", url: "https://www.verivox.de/strom/ratgeber/kuendigungsfrist-strom-1000814/" },
        { label: "Strom-Report — Sonderkündigungsrecht Strom", url: "https://strom-report.com/sonderkuendigungsrecht-strom/" },
      ],
      order: 1,
    },
    {
      id: "guide-seed-3",
      slug: "dental-insurance-basics",
      titleFa: "راهنمای بیمه تکمیلی دندان در آلمان: چه چیزی واقعاً پوشش داده می‌شود؟",
      titleDe: "Zahnzusatzversicherung in Deutschland: Was wird wirklich übernommen?",
      titleRu: "Стоматологическая страховка в Германии: что реально покрывается?",
      excerptFa: "GKV چقدر از هزینه دندان‌پزشکی را پوشش می‌دهد، دوره انتظار یعنی چه، و «Zahnstaffel» چیست.",
      excerptDe: 'Wie viel die GKV bei Zahnbehandlungen übernimmt, was eine Wartezeit bedeutet, und was der "Zahnstaffel" ist.',
      excerptRu: "Сколько GKV покрывает стоматологическое лечение, что такое период ожидания и что такое «Zahnstaffel».",
      bodyFa:
        "## GKV چقدر پوشش می‌دهد؟\n\nبیمه درمانی دولتی (GKV) درمان‌های پایه دندان‌پزشکی و کمک‌هزینه ثابتی برای پروتز و ایمپلنت پرداخت می‌کند، اما این کمک‌هزینه معمولاً فقط بخشی از هزینه واقعی درمان‌های پیچیده‌تر (مثل ایمپلنت، روکش، ارتودنسی بزرگسالان) را می‌پوشاند. تفاوت باقی‌مانده — که می‌تواند چند هزار یورو باشد — بر عهده خود بیمار است، مگر این‌که بیمه تکمیلی دندان داشته باشد.\n\n## دوره انتظار یعنی چه؟\n\nبسیاری از بیمه‌های تکمیلی دندان یک «دوره انتظار» (Wartezeit) دارند — یعنی چند ماه اول بعد از شروع قرارداد، پوشش کامل یا اصلاً وجود ندارد یا محدود است، دقیقاً برای جلوگیری از این‌که کسی فقط برای یک درمان گران‌قیمت مشخص بیمه بخرد و بعد قرارداد را لغو کند. بعضی تعرفه‌ها (مثل آن‌هایی که در تعرفه معرفی می‌شوند) با دوره انتظار صفر عرضه می‌شوند — این یک مزیت واقعی و قابل بررسی است، نه یک ویژگی استاندارد در همه بیمه‌ها.\n\n## «Zahnstaffel» چیست؟\n\nبعضی بیمه‌ها به‌جای دوره انتظار کامل، از یک سیستم پلکانی به نام Zahnstaffel استفاده می‌کنند: در سال اول فقط درصد مشخصی از هزینه پوشش داده می‌شود، و این درصد هر سال بالاتر می‌رود تا به سقف کامل برسد. قبل از امضای هر قرارداد، حتماً جدول Zahnstaffel آن تعرفه مشخص را بخوان — این عدد بین شرکت‌ها بسیار متفاوت است.",
      bodyDe:
        '## Was deckt die GKV ab?\n\nDie gesetzliche Krankenversicherung (GKV) übernimmt grundlegende Zahnbehandlungen und einen festen Zuschuss für Zahnersatz und Implantate — dieser Zuschuss deckt jedoch meist nur einen Teil der tatsächlichen Kosten komplexerer Behandlungen (z. B. Implantate, Kronen, Erwachsenenkieferorthopädie). Die verbleibende Differenz — die mehrere Tausend Euro betragen kann — trägt der Patient selbst, sofern keine Zahnzusatzversicherung besteht.\n\n## Was bedeutet die Wartezeit?\n\nViele Zahnzusatzversicherungen haben eine "Wartezeit" — in den ersten Monaten nach Vertragsbeginn besteht kein oder nur eingeschränkter Versicherungsschutz, genau um zu verhindern, dass jemand nur für eine bestimmte teure Behandlung eine Versicherung abschließt und danach kündigt. Manche Tarife (etwa die bei Tarefe vorgestellten) werden ohne Wartezeit angeboten — das ist ein echter, prüfbarer Vorteil, keine Standardeigenschaft aller Versicherungen.\n\n## Was ist der "Zahnstaffel"?\n\nManche Versicherungen nutzen statt einer vollständigen Wartezeit ein Staffelsystem, den sogenannten Zahnstaffel: Im ersten Jahr wird nur ein bestimmter Prozentsatz der Kosten übernommen, der jährlich ansteigt, bis die volle Deckung erreicht ist. Lesen Sie vor Vertragsabschluss unbedingt die genaue Zahnstaffel-Tabelle des jeweiligen Tarifs — dieser Wert unterscheidet sich stark zwischen den Anbietern.',
      bodyRu:
        "## Что покрывает GKV?\n\nГосударственная медстраховка (GKV) покрывает базовое стоматологическое лечение и фиксированную доплату за протезы и импланты — однако эта доплата обычно покрывает лишь часть реальной стоимости более сложного лечения (импланты, коронки, ортодонтия для взрослых). Оставшуюся разницу — которая может составлять несколько тысяч евро — пациент оплачивает сам, если у него нет дополнительной стоматологической страховки.\n\n## Что означает период ожидания?\n\nУ многих дополнительных стоматологических страховок есть «период ожидания» — в первые месяцы после начала договора покрытие отсутствует или ограничено, именно чтобы кто-то не оформил страховку только ради одного дорогого лечения, а потом не расторг договор. Некоторые тарифы (например, представленные в Tarefe) предлагаются без периода ожидания — это реальное, проверяемое преимущество, а не стандартная особенность всех страховок.\n\n## Что такое «Zahnstaffel»?\n\nНекоторые страховки вместо полного периода ожидания используют ступенчатую систему Zahnstaffel: в первый год покрывается лишь определённый процент расходов, который ежегодно растёт до полного покрытия. Перед подписанием любого договора обязательно изучите таблицу Zahnstaffel конкретного тарифа — этот показатель сильно различается между компаниями.",
      relatedCategory: "insurance",
      relatedSubcategory: "health",
      relatedProductType: "dental",
      verifiedAt: new Date("2026-08-28"),
      sources: [],
      order: 2,
    },
    {
      id: "guide-seed-4",
      slug: "personal-liability-insurance",
      titleFa: "بیمه مسئولیت مدنی: چرا در آلمان تقریباً همه آن را دارند",
      titleDe: "Privathaftpflichtversicherung: Warum sie in Deutschland fast jeder hat",
      titleRu: "Личное страхование ответственности: почему оно есть почти у всех в Германии",
      excerptFa: "این بیمه قانوناً اجباری نیست، اما چرا آلمانی‌ها آن را جزو ضروریات می‌دانند و چه چیزی را واقعاً پوشش می‌دهد.",
      excerptDe: "Diese Versicherung ist gesetzlich nicht verpflichtend, aber warum gilt sie in Deutschland als unverzichtbar, und was deckt sie tatsächlich ab?",
      excerptRu: "Эта страховка не обязательна по закону, но почему в Германии её считают необходимой и что она реально покрывает?",
      bodyFa:
        "## آیا واقعاً اجباری است؟\n\nنه — برخلاف تصور رایج، بیمه مسئولیت مدنی شخصی (Privathaftpflichtversicherung) برای افراد عادی از نظر قانونی اجباری نیست (این با بیمه شخص ثالث خودرو که واقعاً اجباری است، فرق دارد). با این حال، به دلیل نظام حقوقی مسئولیت مدنی آلمان که فرد را برای خسارت‌های ناخواسته به دیگران، حتی خسارت‌های بسیار بزرگ و بلندمدت، مسئول می‌داند، این بیمه در عمل یکی از اولین چیزهایی است که تقریباً هر آلمانی و هر مشاور مهاجرتی توصیه می‌کند.\n\n## چرا این‌قدر مهم تلقی می‌شود؟\n\nدر آلمان، فردی که به‌طور غیرعمد باعث آسیب مالی یا جانی به دیگری شود — مثلاً یک نشتی آب که به آپارتمان همسایه پایین آسیب بزند، یا تصادف با دوچرخه — می‌تواند مسئول جبران کامل خسارت شناخته شود، حتی اگر مبلغ آن بسیار بالا باشد و سال‌ها طول بکشد. این بیمه معمولاً هزینه ماهانه پایینی دارد (اغلب کمتر از قیمت یک وعده غذای بیرون) در مقابل پوششی که می‌تواند صدها هزار یورو باشد؛ به همین دلیل نسبت هزینه به فایده آن یکی از بهترین‌ها در میان همه بیمه‌های شخصی محسوب می‌شود.",
      bodyDe:
        "## Ist sie wirklich verpflichtend?\n\nNein — entgegen einer weit verbreiteten Annahme ist die Privathaftpflichtversicherung für Privatpersonen gesetzlich nicht vorgeschrieben (anders als die Kfz-Haftpflichtversicherung, die tatsächlich Pflicht ist). Aufgrund des deutschen Haftungsrechts, das eine Person auch für unabsichtlich verursachte, mitunter sehr hohe und langfristige Schäden bei anderen haftbar macht, gehört sie in der Praxis jedoch zu den ersten Dingen, die fast jeder Deutsche und jeder Einwanderungsberater empfiehlt.\n\n## Warum gilt sie als so wichtig?\n\nIn Deutschland kann eine Person, die unbeabsichtigt einen finanziellen oder körperlichen Schaden bei jemand anderem verursacht — etwa einen Wasserschaden, der die Wohnung des Nachbarn darunter beschädigt, oder einen Fahrradunfall —, für den vollständigen Ersatz des Schadens haftbar gemacht werden, selbst wenn die Summe sehr hoch ist und sich über Jahre erstreckt. Diese Versicherung kostet in der Regel monatlich wenig (oft weniger als eine Mahlzeit im Restaurant) im Verhältnis zu einer Deckungssumme, die mehrere hunderttausend Euro betragen kann — deshalb gilt ihr Kosten-Nutzen-Verhältnis als eines der besten unter allen Privatversicherungen.",
      bodyRu:
        "## Она действительно обязательна?\n\nНет — вопреки распространённому мнению, личное страхование гражданской ответственности (Privathaftpflichtversicherung) не обязательно по закону для частных лиц (в отличие от автогражданской ответственности, которая действительно обязательна). Однако из-за немецкого законодательства об ответственности, которое возлагает на человека ответственность за непреднамеренный, порой очень крупный и долгосрочный ущерб, причинённый другим, на практике это одна из первых вещей, которые рекомендует почти каждый немец и каждый консультант по иммиграции.\n\n## Почему она считается такой важной?\n\nВ Германии человек, непреднамеренно причинивший финансовый или физический ущерб другому — например, протечка воды, повредившая квартиру соседа снизу, или велосипедная авария, — может быть привлечён к полной компенсации ущерба, даже если сумма очень велика и растягивается на годы. Эта страховка обычно стоит недорого в месяц (часто дешевле обеда в ресторане) при покрытии, которое может достигать сотен тысяч евро — поэтому её соотношение цены и пользы считается одним из лучших среди всех личных страховок.",
      relatedCategory: "insurance",
      relatedSubcategory: "property",
      relatedProductType: "personal-liability",
      verifiedAt: new Date("2026-08-28"),
      sources: [],
      order: 3,
    },
  ];
  for (const guide of guideSeeds) {
    await prisma.guide.upsert({ where: { id: guide.id }, update: {}, create: guide });
  }

  console.log("Seeded:", {
    advisor: advisor.email,
    customer: customer.email,
    mfaTestAdvisor: mfaTestAdvisor.email,
    admin: admin?.email ?? "(skipped — no ADMIN_EMAIL/ADMIN_PASSWORD)",
    faqItems: faqSeeds.length,
    guides: guideSeeds.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
