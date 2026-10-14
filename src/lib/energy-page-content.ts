import type { LocalizedText } from "./taxonomy";

/**
 * Editorial copy for the electricity and gas service pages (PlpView's
 * energy variant) — the long-form sections that sit around the calculator.
 * Electricity is the master text (Farsi, supplied by the team); gas and the
 * de/ru versions are built from the same structure so the two pages cannot
 * drift apart. One builder + a small per-kind vocabulary, instead of two
 * hand-copied 40-string objects, because everything but the commodity word
 * is identical — and a wording fix should land on both pages at once.
 *
 * Length: cut twice on purpose (2026-10-09) — first merging the two
 * "situation" sections and collapsing the process explanations, then a
 * second pass of ~30% that dropped lower-value lines: the "two routes"
 * lead-in, the "other terms" bullet, the team-compares outro, the second
 * explanatory paragraph of "why now", two FAQs already covered elsewhere
 * (contacting the old provider, what data is needed — the calculator asks
 * for PLZ and kWh anyway) and three near-duplicate checklist items. What
 * stayed: every legal/contractual note (Preisgarantie scope, Kündigungsfrist,
 * Neukundenbonus, "supply is never interrupted", free consultation).
 *
 * Deliberate locale differences (not oversights):
 *  - fa/ru say the consultation is in the visitor's own language. de does
 *    not (team decision) — so de has no "native-language" claims in the
 *    copy added here, and the "Persian consultation" benefit becomes
 *    "plain-language explanations" instead.
 *  - Nothing here states a price, percentage or provider claim — same
 *    standing rule as pdp-content.ts.
 */
export type EnergyKind = "electricity" | "gas";

type LT = LocalizedText;

export interface EnergyPageContent {
  situations: {
    title: LT;
    grundversorger: { term: string; label: LT; heading: LT; text: LT; intro: LT; bullets: LT[]; cta: LT };
    alternative: { term: string; label: LT; heading: LT; text: LT };
    reassurance: { title: LT; paragraphs: LT[] };
  };
  whyNow: {
    title: LT;
    /** The LAST entry leads into the Preisgarantie card (rendered above it); everything before it is body text. */
    paragraphs: LT[];
    callout: { term: string; label: LT; body: LT; chart: { today: LT; end: LT; market: LT; yours: LT; note: LT } };
    closing: LT;
  };
  whyTarefe: {
    title: LT;
    /** Empty-string entries are dropped at render — lets one locale omit a sentence without a separate code path. */
    lead: LT[];
    items: { key: "compare" | "human" | "dedicated" | "admin" | "support"; title: LT; body: LT }[];
  };
  process: { title: LT; steps: { title: LT; body: LT }[]; cta: LT };
  whenToCheck: { title: LT; lead: LT; items: LT[]; /** "{n}" is replaced with the count of ticked items. */ result: LT; cta: LT };
  faqTitle: LT;
  faq: { q: LT; a: LT }[];
}

const t = (fa: string, de: string, ru: string): LT => ({ fa, de, ru });

const VOCAB: Record<
  EnergyKind,
  {
    /** Farsi: برق / گاز */
    fa: string;
    /** German compound prefix: Strom / Gas */
    de: string;
    /** "Ihren Strom" (masculine accusative) vs "Ihr Gas" (neuter) — the one place the article differs. */
    deYour: string;
    ru: { what: string; whatCap: string; whatGen: string; whatDat: string; suppGen: string; tariffOn: string; tariffsOn: string };
  }
> = {
  electricity: {
    fa: "برق",
    de: "Strom",
    deYour: "Ihren Strom",
    ru: { what: "электричество", whatCap: "Электричество", whatGen: "электричества", whatDat: "электричеству", suppGen: "электроэнергии", tariffOn: "тариф на электричество", tariffsOn: "тарифы на электричество" },
  },
  gas: {
    fa: "گاز",
    de: "Gas",
    deYour: "Ihr Gas",
    ru: { what: "газ", whatCap: "Газ", whatGen: "газа", whatDat: "газу", suppGen: "газа", tariffOn: "тариф на газ", tariffsOn: "тарифы на газ" },
  },
};

function build(kind: EnergyKind): EnergyPageContent {
  const { fa: n, de: P, deYour: Y, ru: r } = VOCAB[kind];

  return {
    // One block, two situations: what each supply route is AND what the
    // visitor can do about it.
    situations: {
      title: t(`اول ببینیم الان ${n} خانه‌ات از کجا تأمین می‌شود`, `Zuerst klären wir, woher Ihr ${P} aktuell kommt`, `Сначала посмотрим, откуда сейчас поступает ${r.what} в ваш дом`),
      grundversorger: {
        term: "Stadtwerke",
        label: t("تأمین‌کننده پایه منطقه", "Basisversorger Ihrer Region", "Базовый поставщик региона"),
        heading: t(`اگر الان از Stadtwerke ${n} می‌گیری...`, `Wenn Sie ${Y} aktuell von den Stadtwerken beziehen …`, `Если сейчас вы получаете ${r.what} от Stadtwerke…`),
        text: t(
          `اگر قرارداد مشخصی با یک شرکت ${n} نبسته باشی، ${n} خانه‌ات از Grundversorger منطقه تأمین می‌شود — در بسیاری از مناطق یکی از Stadtwerkeها. اگر مدت‌هاست تعرفه‌ات را بررسی نکرده‌ای، ارزش دارد گزینه‌های دیگر را هم ببینی.`,
          `Ohne eigenen Vertrag mit einem ${P}anbieter beliefert Sie der Grundversorger Ihrer Region — in vielen Regionen die Stadtwerke. Wenn Sie Ihren Tarif lange nicht geprüft haben, lohnt sich ein Blick auf andere Angebote.`,
          `Если вы сами не заключали договор с поставщиком ${r.suppGen}, поставку ведёт базовый поставщик (Grundversorger) региона — во многих регионах это Stadtwerke. Если вы давно не проверяли тариф, стоит взглянуть и на другие предложения.`
        ),
        // Phrased as what WE check, not as what an alternative contract
        // "may" offer: an alternative is not guaranteed to be cheaper, so
        // the certainty belongs on our action, not on an outcome.
        intro: t("گزینه‌های جایگزین را از این نظر بررسی می‌کنیم:", "Wir prüfen alternative Verträge auf:", "Мы сравниваем альтернативные договоры по параметрам:"),
        bullets: [
          t("قیمت مناسب‌تر", "günstigeren Preis", "более выгодную цену"),
          t("Preisgarantie", "Preisgarantie", "гарантию цены (Preisgarantie)"),
          t("Neukundenbonus", "Neukundenbonus", "бонус для новых клиентов (Neukundenbonus)"),
        ],
        cta: t("رایگان مقایسه کنید", "Kostenlos vergleichen", "Сравнить бесплатно"),
      },
      alternative: {
        term: `Alternativer ${P}anbieter`,
        label: t("تأمین‌کننده انتخابی", "Selbst gewählter Anbieter", "Поставщик по вашему выбору"),
        heading: t("اگر با یک شرکت دیگر قرارداد داری چی؟", "Und wenn ich bei einem anderen Anbieter bin?", "А если у меня договор с другой компанией?"),
        text: t(
          `هر قرارداد مدت و شرایط فسخ مشخصی دارد. حتی اگر قرارداد هنوز تمام نشده، تاریخ پایان و Kündigungsfrist را بررسی می‌کنیم تا زمان مناسب تغییر مشخص شود — و Kündigung و شروع قرارداد جدید را هم ما پیگیری می‌کنیم.`,
          `Jeder Vertrag hat eine feste Laufzeit und Kündigungsbedingungen. Auch wenn er noch läuft, prüfen wir Vertragsende und Kündigungsfrist, um den passenden Wechselzeitpunkt zu finden — und übernehmen Kündigung und Start des neuen Vertrags.`,
          `У любого договора есть срок и условия расторжения. Даже если он ещё не закончился, мы проверим дату окончания и Kündigungsfrist, чтобы найти подходящий момент для смены, — и возьмём на себя Kündigung и начало нового договора.`
        ),
      },
      reassurance: {
        title: t("مهم‌تر از همه:", "Das Wichtigste:", "Самое важное:"),
        paragraphs: [
          t(`تغییر تأمین‌کننده باعث قطع شدن ${n} خانه نمی‌شود.`, `Ein Anbieterwechsel führt nicht zu einer Unterbrechung der ${P}versorgung.`, `Смена поставщика не приводит к отключению ${r.whatGen} в доме.`),
          t(
            `شبکه ${n} منطقه همان می‌ماند؛ فقط شرکت طرف قرارداد عوض می‌شود.`,
            `Das ${P}netz Ihrer Region bleibt dasselbe; nur Ihr Vertragspartner wechselt.`,
            `Сеть вашего региона остаётся прежней; меняется только компания, с которой у вас договор.`
          ),
        ],
      },
    },

    whyNow: {
      title: t(`چرا الان بررسی تعرفه ${n} مهم‌تر شده؟`, `Warum ist ein Tarifcheck beim ${P} jetzt wichtiger?`, `Почему проверить ${r.tariffOn} сейчас важнее?`),
      paragraphs: [
        t(
          "قیمت انرژی در سال‌های اخیر به‌خاطر نوسانات بازار و بحران‌های جهانی زیاد تغییر کرده؛ پس فقط قیمت امروز مهم نیست، شرایط قراردادت برای ماه‌ها و سال آینده هم مهم است.",
          "Die Energiepreise haben sich durch Marktschwankungen und globale Krisen stark verändert — es zählt nicht nur der heutige Preis, sondern auch, was Ihr Vertrag für die kommenden Monate und Jahre festlegt.",
          "Цены на энергию заметно менялись из-за колебаний рынка и мировых кризисов — важна не только сегодняшняя цена, но и условия договора на ближайшие месяцы и годы."
        ),
        t("در همه تعرفه‌های ما:", "Bei allen unseren Tarifen:", "Во всех наших тарифах:"),
      ],
      // Business fact supplied by the team (2026-10-09): EVERY tariff we
      // offer carries a price guarantee and the price is fixed until the
      // end of the contract term. Do not soften this back to "some tariffs"
      // or "depends on the contract" — that was an earlier wording mistake.
      callout: {
        term: "Preisgarantie",
        label: t("تضمین قیمت تا پایان دوره قرارداد", "Preisstabilität bis zum Ende der Vertragslaufzeit", "Гарантия цены до конца срока договора"),
        body: t(
          "همه تعرفه‌های ما Preisgarantie دارند: قیمت تا پایان دوره قرارداد ثابت می‌ماند.",
          "Alle unsere Tarife haben eine Preisgarantie: Der Preis bleibt bis zum Ende der Vertragslaufzeit unverändert.",
          "У всех наших тарифов есть гарантия цены: цена остаётся неизменной до конца срока договора."
        ),
        // Labels for the schematic price line (PriceGuaranteeChart). No
        // numbers on purpose — it illustrates the guarantee, not a price.
        chart: {
          today: t("امروز", "Heute", "Сегодня"),
          end: t("پایان دوره قرارداد", "Ende der Vertragslaufzeit", "Конец срока договора"),
          market: t("قیمت بازار", "Marktpreis", "Рыночная цена"),
          yours: t("قیمت تو", "Ihr Preis", "Ваша цена"),
          note: t("نمودار نمادین", "Schematische Darstellung", "Схематичное изображение"),
        },
      },
      closing: t(
        "یعنی قیمتی که امروز می‌بینی، تا پایان دوره قرارداد همان می‌ماند.",
        "Der Preis, den Sie heute sehen, bleibt also bis zum Ende der Laufzeit derselbe.",
        "То есть цена, которую вы видите сегодня, остаётся прежней до конца срока договора."
      ),
    },

    whyTarefe: {
      title: t(`چرا مقایسه ${n} را به تعرفه بسپری؟`, `Warum den ${P}vergleich Tarefe überlassen?`, "Почему доверить сравнение Tarefe?"),
      lead: [
        // The native-language clause — fa/ru only; de leaves it out (see the file comment).
        t(
          "مسئله فقط پیدا کردن یک عدد ارزان‌تر نیست؛ ما کمک می‌کنیم شرایط قراردادها را بفهمی و گزینه مناسب‌تر را انتخاب کنی — به زبان مادری خودت.",
          "Es geht nicht nur um die günstigere Zahl: Wir helfen Ihnen, die Vertragsbedingungen zu verstehen und die passende Option zu wählen.",
          "Дело не только в цифре поменьше: мы помогаем понять условия договоров и выбрать подходящий вариант — на вашем родном языке."
        ),
      ],
      items: [
        {
          key: "compare",
          title: t("مقایسه گزینه‌های مختلف", "Vergleich verschiedener Optionen", "Сравнение разных вариантов"),
          body: t("گزینه‌های ارائه‌دهندگان مختلف را بررسی می‌کنیم.", "Wir prüfen Angebote verschiedener Anbieter.", "Изучаем предложения разных поставщиков."),
        },
        {
          key: "human",
          title: t("مشاوره فارسی", "Verständliche Erklärungen", "Консультация на вашем языке"),
          body: t("بدون درگیری با اصطلاحات پیچیده آلمانی.", "Ohne komplizierte Fachbegriffe.", "Без сложных немецких терминов."),
        },
        {
          key: "dedicated",
          title: t("مشاور شخصی", "Persönlicher Berater", "Личный консультант"),
          body: t("یک مشاور واقعی در تمام مسیر کنارت است.", "Ein echter Berater begleitet Sie durch den ganzen Prozess.", "Настоящий консультант рядом на всём пути."),
        },
        {
          key: "admin",
          title: t("انجام کارهای قراردادی", "Vertragliche Erledigungen", "Договорные вопросы"),
          body: t("ثبت قرارداد، تغییر تأمین‌کننده و Kündigung را پیگیری می‌کنیم.", "Wir übernehmen Vertragsabschluss, Anbieterwechsel und Kündigung.", "Берём на себя оформление договора, смену поставщика и Kündigung."),
        },
        {
          key: "support",
          title: t("پشتیبانی بعد از قرارداد", "Support nach Vertragsabschluss", "Поддержка после заключения договора"),
          body: t("بعد از قرارداد هم — آدرس، قبض و امور قراردادی — کنارت هستیم.", "Auch danach — Adresse, Rechnung, Vertragsfragen — sind wir da.", "И после договора — адрес, счета, вопросы по договору — мы рядом."),
        },
      ],
    },

    process: {
      title: t("فرآیند تغییر تعرفه با تعرفه چطور است؟", "Wie läuft der Tarifwechsel mit Tarefe ab?", "Как проходит смена тарифа с Tarefe?"),
      steps: [
        {
          title: t("درخواستت را ثبت می‌کنی", "Sie senden Ihre Anfrage", "Вы оставляете заявку"),
          body: t(`اطلاعات اولیه ${n} و شرایطت را برای ما می‌فرستی.`, `Sie schicken uns erste Angaben zu Ihrem ${P} und Ihrer Situation.`, `Вы отправляете нам первичные данные по ${r.whatDat} и вашей ситуации.`),
        },
        {
          title: t("مشاور باهات تماس می‌گیرد", "Ein Berater meldet sich", "Консультант связывается с вами"),
          body: t("یک مشاور فارسی‌زبان شرایطت را بررسی می‌کند.", "Ein Berater prüft Ihre Situation.", "Консультант на вашем языке изучает вашу ситуацию."),
        },
        {
          title: t("قرارداد فعلی بررسی می‌شود", "Ihr aktueller Vertrag wird geprüft", "Проверяется текущий договор"),
          body: t(
            "مصرف، تعرفه فعلی، مدت قرارداد و شرایط Kündigung بررسی می‌شود.",
            "Verbrauch, aktueller Tarif, Vertragslaufzeit und Kündigungsbedingungen werden geprüft.",
            "Проверяются потребление, текущий тариф, срок договора и условия Kündigung."
          ),
        },
        {
          title: t("گزینه‌های موجود مقایسه می‌شوند", "Verfügbare Optionen werden verglichen", "Сравниваются доступные варианты"),
          body: t(
            "Arbeitspreis، Grundpreis، Preisgarantie و سایر شرایط را بررسی می‌کنیم.",
            "Wir prüfen Arbeitspreis, Grundpreis, Preisgarantie und weitere Konditionen.",
            "Мы изучаем Arbeitspreis, Grundpreis, Preisgarantie и другие условия."
          ),
        },
        {
          title: t("گزینه مناسب انتخاب می‌شود", "Die passende Option wird gewählt", "Выбирается подходящий вариант"),
          body: t(
            "بعد از توضیح شرایط، اگر بخواهی، قرارداد جدید ثبت می‌شود.",
            "Nachdem wir die Konditionen erklärt haben, wird auf Wunsch ein neuer Vertrag abgeschlossen.",
            "После объяснения условий, если вы захотите, оформляется новый договор."
          ),
        },
        {
          title: t("تعرفه و قرارداد پیگیری می‌شود", "Wechsel und Vertrag werden begleitet", "Тариф и договор сопровождаются"),
          body: t(
            "تیم تعرفه مراحل تغییر و امور مربوط به قرارداد را پیگیری می‌کند.",
            "Das Tarefe-Team begleitet den Wechsel und die vertraglichen Angelegenheiten.",
            "Команда Tarefe сопровождает смену и все вопросы, связанные с договором."
          ),
        },
      ],
      cta: t("درخواست مشاوره رایگان", "Kostenlose Beratung anfragen", "Запросить бесплатную консультацию"),
    },

    whenToCheck: {
      title: t(`چه زمانی بهتر است تعرفه ${n}م را بررسی کنم؟`, `Wann sollte ich meinen ${P}tarif prüfen?`, `Когда стоит проверить ${r.tariffOn}?`),
      lead: t(
        "اگر یکی از این شرایط را داری، ارزش دارد قراردادت را بررسی کنی:",
        "Wenn einer dieser Punkte auf Sie zutrifft, lohnt sich ein Blick auf Ihren Vertrag:",
        "Если подходит хотя бы один из пунктов, стоит проверить ваш договор:"
      ),
      items: [
        t(`مدت زیادی است تعرفه ${n}ت را عوض نکرده‌ای`, `Sie haben Ihren ${P}tarif schon lange nicht mehr gewechselt`, `Вы давно не меняли ${r.tariffOn}`),
        t(`از Grundversorger ${n} می‌گیری`, `Sie beziehen ${Y} vom Grundversorger`, `Вы получаете ${r.what} от Grundversorger`),
        t("قرارداد فعلی‌ات به‌زودی تمام می‌شود و می‌خواهی گزینه‌های دیگر را ببینی", "Ihr Vertrag läuft bald aus und Sie möchten andere Optionen sehen", "Ваш договор скоро заканчивается, и вы хотите увидеть другие варианты"),
        t(`قبض ${n}ت بالا رفته یا نمی‌دانی دقیقاً چه Arbeitspreis و Grundpreis پرداخت می‌کنی`, `Ihre ${P}rechnung ist gestiegen oder Sie kennen Ihren Arbeitspreis und Grundpreis nicht genau`, `Счёт за ${r.what} вырос или вы не знаете точно свой Arbeitspreis и Grundpreis`),
      ],
      result: t(
        "{n} مورد برایت صدق می‌کند — ارزش دارد قراردادت را بررسی کنیم.",
        "Zutreffende Punkte: {n} — ein Blick auf Ihren Vertrag lohnt sich.",
        "Отмечено пунктов: {n} — стоит проверить ваш договор."
      ),
      cta: t("درخواست مشاوره رایگان", "Kostenlose Beratung anfragen", "Запросить бесплатную консультацию"),
    },

    faqTitle: t("سوالات متداول", "Häufige Fragen", "Частые вопросы"),
    faq: [
      {
        q: t(`آیا با تغییر شرکت ${n}، ${n} خانه قطع می‌شود؟`, `Wird meine ${P}versorgung unterbrochen, wenn ich den Anbieter wechsle?`, `Отключат ли ${r.what} в доме при смене компании?`),
        a: t(
          `خیر. تأمین از طریق شبکه ادامه دارد و فقط شرکت طرف قرارداد عوض می‌شود.`,
          "Nein. Die Versorgung läuft weiter über das Netz — nur der Vertragspartner ändert sich.",
          `Нет. Снабжение продолжается через сеть — меняется только компания, с которой у вас договор.`
        ),
      },
      {
        q: t("اگر هنوز قرارداد فعلی‌ام تمام نشده باشد، می‌توانم تغییرش بدهم؟", "Kann ich wechseln, wenn mein aktueller Vertrag noch läuft?", "Можно ли сменить поставщика, если текущий договор ещё не закончился?"),
        a: t(
          "بله، با رعایت Kündigungsfrist. تیم تعرفه شرایط و مدت قرارداد را بررسی می‌کند و زمان مناسب تغییر را مشخص می‌کند.",
          "Ja, unter Einhaltung der Kündigungsfrist. Das Tarefe-Team prüft Vertragsbedingungen und Laufzeit und bestimmt den passenden Zeitpunkt.",
          "Да, с соблюдением Kündigungsfrist. Команда Tarefe проверит условия и срок договора и определит подходящий момент."
        ),
      },
      {
        q: t(`آیا تعرفه فقط ${P}preis را مقایسه می‌کند؟`, `Vergleicht Tarefe nur den ${P}preis?`, `Сравнивает ли Tarefe только цену ${r.whatGen}?`),
        a: t(
          "خیر. Arbeitspreis، Grundpreis، Preisgarantie، مدت قرارداد، شرایط فسخ و Bonus هم در نظر گرفته می‌شوند.",
          "Nein. Berücksichtigt werden auch Arbeitspreis, Grundpreis, Preisgarantie, Vertragslaufzeit, Kündigungsbedingungen und Boni.",
          "Нет. Учитываются также Arbeitspreis, Grundpreis, Preisgarantie, срок договора, условия расторжения и бонусы."
        ),
      },
      {
        q: t("آیا برای بررسی تعرفه باید هزینه‌ای پرداخت کنم؟", "Muss ich für die Prüfung bezahlen?", "Нужно ли платить за проверку тарифа?"),
        a: t(
          "درخواست مشاوره اولیه و بررسی شرایط برای شما رایگان است.",
          "Die Anfrage zur Erstberatung und die Prüfung Ihrer Situation sind für Sie kostenlos.",
          "Запрос первичной консультации и проверка вашей ситуации для вас бесплатны."
        ),
      },
    ],
  };
}

const CACHE: Partial<Record<EnergyKind, EnergyPageContent>> = {};

export function getEnergyPageContent(kind: EnergyKind): EnergyPageContent {
  return (CACHE[kind] ??= build(kind));
}
