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
  supply: {
    title: LT;
    lead: LT;
    /** Link under each path card, pointing down at the matching card in the options section. */
    linkLabel: LT;
    paths: { key: "grundversorger" | "alternative"; term: string; label: LT; paragraphs: LT[] }[];
  };
  whyNow: {
    title: LT;
    paragraphs: LT[];
    callout: { term: string; label: LT; body: LT };
    closing: LT;
  };
  options: {
    grundversorger: { title: LT; lead: LT; intro: LT; bullets: LT[]; outro: LT; cta: LT };
    other: { title: LT; paragraphs: LT[] };
    reassurance: { title: LT; paragraphs: LT[] };
  };
  whyTarefe: {
    title: LT;
    /** Empty-string entries are dropped at render — lets one locale omit a sentence (the native-language line, de) without a separate code path. */
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
    supply: {
      title: t(`اول ببینیم الان ${n} خانه‌ات از کجا تأمین می‌شود`, `Zuerst klären wir, woher Ihr ${P} aktuell kommt`, `Сначала посмотрим, откуда сейчас поступает ${r.what} в ваш дом`),
      lead: t(
        `در آلمان معمولاً ممکن است ${n} خانه‌ات از یکی از این دو مسیر تأمین شود:`,
        `In Deutschland kann Ihr ${P} in der Regel auf einem von zwei Wegen geliefert werden:`,
        `В Германии ${r.what} в дом обычно поставляется одним из двух способов:`
      ),
      linkLabel: t("ببین چه گزینه‌هایی داری", "Ihre Möglichkeiten ansehen", "Посмотреть варианты"),
      paths: [
        {
          key: "grundversorger",
          term: "Stadtwerke / Grundversorger",
          label: t("تأمین‌کننده پایه منطقه", "Grundversorger Ihrer Region", "Базовый поставщик региона"),
          paragraphs: [
            t(
              `اگر خودت قرارداد مشخصی با یک شرکت ${n} نبسته باشی، ممکن است ${n} خانه‌ات از Grundversorger منطقه تأمین شود. در بسیاری از مناطق، این شرکت یکی از Stadtwerkeهاست.`,
              `Wenn Sie keinen eigenen Vertrag mit einem ${P}anbieter abgeschlossen haben, wird Ihr ${P} möglicherweise vom Grundversorger Ihrer Region geliefert. In vielen Regionen sind das die Stadtwerke.`,
              `Если вы сами не заключали договор с поставщиком ${r.suppGen}, ${r.what} может поставляться базовым поставщиком (Grundversorger) вашего региона. Во многих регионах это одно из Stadtwerke.`
            ),
            t(
              `اگر مدت‌هاست تعرفه ${n}ت را بررسی نکرده‌ای، ممکن است ارزش داشته باشد گزینه‌های دیگر بازار را هم ببینی.`,
              `Wenn Sie Ihren ${P}tarif schon lange nicht mehr geprüft haben, kann sich ein Blick auf andere Angebote am Markt lohnen.`,
              `Если вы давно не проверяли свой ${r.tariffOn}, возможно, стоит взглянуть и на другие предложения на рынке.`
            ),
          ],
        },
        {
          key: "alternative",
          term: `Alternativer ${P}anbieter`,
          label: t("تأمین‌کننده انتخابی", "Selbst gewählter Anbieter", "Поставщик по вашему выбору"),
          paragraphs: [
            t(
              `اگر خودت یک شرکت دیگر را برای ${n} انتخاب کرده باشی، با آن شرکت یک قرارداد مشخص داری که معمولاً شامل مواردی مثل مدت قرارداد، شرایط فسخ، قیمت و Preisgarantie است.`,
              `Haben Sie selbst einen anderen Anbieter gewählt, besteht mit diesem ein konkreter Vertrag — meist mit Laufzeit, Kündigungsbedingungen, Preis und Preisgarantie.`,
              `Если вы сами выбрали другого поставщика, у вас заключён договор с этой компанией — обычно он включает срок действия, условия расторжения, цену и гарантию цены (Preisgarantie).`
            ),
            t(
              "اگر قراردادت هنوز تمام نشده هم می‌توانیم شرایطش را بررسی کنیم و ببینیم چه زمانی و با چه شرایطی امکان تغییر وجود دارد.",
              "Auch wenn Ihr Vertrag noch läuft, können wir die Bedingungen prüfen und klären, wann und unter welchen Voraussetzungen ein Wechsel möglich ist.",
              "Даже если договор ещё не закончился, мы можем проверить его условия и выяснить, когда и на каких условиях возможна смена."
            ),
          ],
        },
      ],
    },

    whyNow: {
      title: t(`چرا الان بررسی تعرفه ${n} مهم‌تر شده؟`, `Warum ist ein Tarifcheck beim ${P} jetzt wichtiger?`, `Почему проверить ${r.tariffOn} сейчас важнее?`),
      paragraphs: [
        t(
          "قیمت انرژی در سال‌های اخیر تحت تأثیر عواملی مثل نوسانات بازار انرژی و بحران‌های جهانی تغییرات زیادی داشته است.",
          "Die Energiepreise haben sich in den letzten Jahren durch Schwankungen am Energiemarkt und globale Krisen stark verändert.",
          "Цены на энергию в последние годы заметно менялись под влиянием колебаний энергетического рынка и мировых кризисов."
        ),
        t(
          "به همین دلیل، فقط قیمت امروز مهم نیست؛ شرایط قراردادت برای ماه‌ها و سال آینده هم اهمیت دارد.",
          "Deshalb zählt nicht nur der heutige Preis — auch die Vertragsbedingungen für die kommenden Monate und Jahre sind wichtig.",
          "Поэтому важна не только сегодняшняя цена — условия договора на ближайшие месяцы и годы тоже имеют значение."
        ),
        t("یکی از مواردی که می‌توان هنگام مقایسه بررسی کرد:", "Ein Punkt, den man beim Vergleich prüfen kann:", "Один из пунктов, которые стоит проверить при сравнении:"),
      ],
      callout: {
        term: "Preisgarantie",
        label: t("تضمین قیمت برای یک بازه مشخص", "Preisstabilität für einen festgelegten Zeitraum", "Гарантия цены на определённый срок"),
        body: t(
          "بعضی تعرفه‌ها برای مدت مشخصی قیمت برخی اجزای قرارداد را ثابت نگه می‌دارند. البته مدت و محدوده این تضمین به خود قرارداد بستگی دارد.",
          "Manche Tarife halten den Preis einzelner Vertragsbestandteile für einen bestimmten Zeitraum stabil. Dauer und Umfang der Garantie hängen vom jeweiligen Vertrag ab.",
          "Некоторые тарифы фиксируют цену отдельных компонентов договора на определённый срок. Срок и объём такой гарантии зависят от конкретного договора."
        ),
      },
      closing: t(
        "یعنی هنگام مقایسه، فقط دنبال «قیمت پایین‌تر» نباش؛ ببین این قیمت تحت چه شرایطی ارائه شده است.",
        "Suchen Sie beim Vergleich also nicht nur den „niedrigeren Preis“ — schauen Sie, unter welchen Bedingungen er angeboten wird.",
        "Поэтому при сравнении не ищите просто «цену пониже» — посмотрите, на каких условиях она предложена."
      ),
    },

    options: {
      grundversorger: {
        title: t(`اگر الان از Stadtwerke ${n} می‌گیری...`, `Wenn Sie ${Y} aktuell von den Stadtwerken beziehen …`, `Если сейчас вы получаете ${r.what} от Stadtwerke…`),
        lead: t(
          `اگر ${n} خانه‌ات از Grundversorger تأمین می‌شود، می‌توانی گزینه‌های دیگر بازار را هم بررسی کنی.`,
          `Wenn Ihr ${P} vom Grundversorger geliefert wird, können Sie auch andere Angebote am Markt prüfen.`,
          `Если ${r.what} поставляет Grundversorger, вы можете рассмотреть и другие предложения на рынке.`
        ),
        intro: t("ممکن است یک قرارداد جایگزین:", "Ein alternativer Vertrag kann:", "Альтернативный договор может:"),
        bullets: [
          t("قیمت مناسب‌تری داشته باشد", "einen günstigeren Preis bieten", "предлагать более выгодную цену"),
          t("شامل Preisgarantie باشد", "eine Preisgarantie enthalten", "включать гарантию цены (Preisgarantie)"),
          t("شرایط قرارداد متفاوتی ارائه دهد", "andere Vertragsbedingungen bieten", "предлагать другие условия договора"),
          t("یا در صورت وجود، Neukundenbonus داشته باشد", "oder — falls vorhanden — einen Neukundenbonus enthalten", "или — при наличии — включать бонус для новых клиентов (Neukundenbonus)"),
        ],
        outro: t(
          "تیم تعرفه شرایط محل زندگی و مصرفت را بررسی می‌کند و گزینه‌های موجود را با هم مقایسه می‌کنیم.",
          "Das Tarefe-Team prüft Ihren Wohnort und Ihren Verbrauch, und wir vergleichen gemeinsam die verfügbaren Optionen.",
          "Команда Tarefe проверит условия вашего места жительства и потребление, и мы вместе сравним доступные варианты."
        ),
        cta: t("رایگان مقایسه کنید", "Kostenlos vergleichen", "Сравнить бесплатно"),
      },
      other: {
        title: t("اگر با یک شرکت دیگر قرارداد داری چی؟", "Und wenn ich bei einem anderen Anbieter bin?", "А если у меня договор с другой компанией?"),
        paragraphs: [
          t(
            `اگر الان با یک alternativer ${P}anbieter قرارداد داری و مدت قرارداد هنوز تمام نشده، باز هم می‌توانیم شرایط آن را بررسی کنیم.`,
            `Wenn Sie aktuell bei einem alternativen ${P}anbieter unter Vertrag sind und die Laufzeit noch nicht abgelaufen ist, können wir die Bedingungen trotzdem prüfen.`,
            `Если сейчас у вас договор с альтернативным поставщиком (alternativer ${P}anbieter) и срок ещё не истёк, мы всё равно можем проверить его условия.`
          ),
          t(
            "تاریخ پایان قرارداد، Kündigungsfrist و شرایط فسخ بررسی می‌شود تا مشخص شود چه زمانی امکان تغییر وجود دارد.",
            "Wir prüfen Vertragsende, Kündigungsfrist und Kündigungsbedingungen, um zu klären, wann ein Wechsel möglich ist.",
            "Проверяются дата окончания договора, срок уведомления (Kündigungsfrist) и условия расторжения — чтобы понять, когда возможна смена."
          ),
          t(
            "اگر نیاز به ارسال Kündigung یا هماهنگی برای شروع قرارداد جدید باشد، تیم تعرفه این مراحل را هم پیگیری می‌کند.",
            "Muss eine Kündigung verschickt oder der Start eines neuen Vertrags koordiniert werden, übernimmt das Tarefe-Team auch diese Schritte.",
            "Если нужно отправить уведомление о расторжении (Kündigung) или согласовать начало нового договора, команда Tarefe возьмёт на себя и эти шаги."
          ),
        ],
      },
      reassurance: {
        title: t("مهم‌تر از همه:", "Das Wichtigste:", "Самое важное:"),
        paragraphs: [
          t(`تغییر تأمین‌کننده باعث قطع شدن ${n} خانه نمی‌شود.`, `Ein Anbieterwechsel führt nicht zu einer Unterbrechung der ${P}versorgung.`, `Смена поставщика не приводит к отключению ${r.whatGen} в доме.`),
          t(
            `${n} همچنان از شبکه ${n} منطقه به خانه‌ات می‌رسد؛ چیزی که تغییر می‌کند، شرکت تأمین‌کننده‌ای است که با آن قرارداد داری.`,
            `${P} kommt weiterhin über das ${P}netz Ihrer Region zu Ihnen nach Hause; geändert wird nur das Unternehmen, mit dem Sie den Vertrag haben.`,
            `${r.whatCap} по-прежнему поступает по сети вашего региона; меняется только компания, с которой у вас заключён договор.`
          ),
        ],
      },
    },

    whyTarefe: {
      title: t(`چرا مقایسه ${n} را به تعرفه بسپری؟`, `Warum den ${P}vergleich Tarefe überlassen?`, "Почему доверить сравнение Tarefe?"),
      lead: [
        t(`خودت هم می‌توانی تعرفه‌های ${n} را در سایت‌های مختلف بررسی کنی.`, `Sie können ${P}tarife auch selbst auf verschiedenen Portalen prüfen.`, `Вы можете сами проверять ${r.tariffsOn} на разных порталах.`),
        t("اما مسئله فقط پیدا کردن یک عدد ارزان‌تر نیست.", "Aber es geht nicht nur darum, eine günstigere Zahl zu finden.", "Но дело не только в том, чтобы найти цифру поменьше."),
        t(
          "ما کمک می‌کنیم شرایط قراردادها را بهتر متوجه شوی و گزینه‌ای را انتخاب کنی که با شرایط تو مناسب‌تر باشد.",
          "Wir helfen Ihnen, die Vertragsbedingungen besser zu verstehen und die Option zu wählen, die am besten zu Ihrer Situation passt.",
          "Мы помогаем лучше понять условия договоров и выбрать вариант, который подходит именно вам."
        ),
        // The native-language line — fa/ru only. de is intentionally empty (see the file comment).
        t("و این کار را به زبان مادری خودت انجام می‌دهیم.", "", "И мы делаем это на вашем родном языке."),
      ],
      items: [
        {
          key: "compare",
          title: t("مقایسه گزینه‌های مختلف", "Vergleich verschiedener Optionen", "Сравнение разных вариантов"),
          body: t("گزینه‌های موجود از ارائه‌دهندگان مختلف را بررسی می‌کنیم.", "Wir prüfen die verfügbaren Angebote verschiedener Anbieter.", "Изучаем доступные предложения разных поставщиков."),
        },
        {
          key: "human",
          title: t("مشاوره فارسی", "Verständliche Erklärungen", "Консультация на вашем языке"),
          body: t(
            "لازم نیست برای فهمیدن شرایط قرارداد با اصطلاحات پیچیده آلمانی درگیر شوی.",
            "Sie müssen sich nicht mit komplizierten Fachbegriffen herumschlagen, um Ihre Vertragsbedingungen zu verstehen.",
            "Вам не придётся разбираться в сложных немецких терминах, чтобы понять условия договора."
          ),
        },
        {
          key: "dedicated",
          title: t("مشاور شخصی", "Persönlicher Berater", "Личный консультант"),
          body: t(
            "یک مشاور واقعی شرایطت را بررسی می‌کند و در طول فرآیند کنارت است.",
            "Ein echter Berater prüft Ihre Situation und begleitet Sie durch den gesamten Prozess.",
            "Настоящий консультант проверит вашу ситуацию и будет рядом на протяжении всего процесса."
          ),
        },
        {
          key: "admin",
          title: t("انجام کارهای قراردادی", "Vertragliche Erledigungen", "Договорные вопросы"),
          body: t(
            "در صورت نیاز، مراحل ثبت قرارداد، تغییر تأمین‌کننده و امور مربوط به Kündigung را پیگیری می‌کنیم.",
            "Bei Bedarf übernehmen wir Vertragsabschluss, Anbieterwechsel und die Kündigung.",
            "При необходимости мы возьмём на себя оформление договора, смену поставщика и вопросы, связанные с Kündigung."
          ),
        },
        {
          key: "support",
          title: t("پشتیبانی بعد از قرارداد", "Support nach Vertragsabschluss", "Поддержка после заключения договора"),
          body: t(
            "بعد از ثبت قرارداد هم اگر موضوعی مثل تغییر آدرس، ارسال قبض یا پیگیری امور قراردادی داشته باشی، می‌توانی روی تیم تعرفه حساب کنی.",
            "Auch nach Vertragsabschluss — etwa bei Adressänderung, Rechnungsversand oder Vertragsfragen — können Sie auf das Tarefe-Team zählen.",
            "И после заключения договора — например, при смене адреса, отправке счёта или вопросах по договору — вы можете рассчитывать на команду Tarefe."
          ),
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
        t("قرارداد فعلی‌ات به‌زودی تمام می‌شود", "Ihr aktueller Vertrag läuft bald aus", "Ваш текущий договор скоро заканчивается"),
        t(`قبض ${n}ت نسبت به قبل بیشتر شده`, `Ihre ${P}rechnung ist höher als früher`, `Счёт за ${r.what} стал больше, чем раньше`),
        t("نمی‌دانی دقیقاً چه Arbeitspreis یا Grundpreis پرداخت می‌کنی", "Sie wissen nicht genau, welchen Arbeitspreis oder Grundpreis Sie zahlen", "Вы не знаете точно, какой Arbeitspreis или Grundpreis платите"),
        t("می‌خواهی تعرفه‌های دیگر را مقایسه کنی", "Sie möchten andere Tarife vergleichen", "Вы хотите сравнить другие тарифы"),
        t("می‌خواهی قبل از تمدید قرارداد گزینه‌های دیگر را ببینی", "Sie möchten vor einer Vertragsverlängerung andere Optionen sehen", "Вы хотите увидеть другие варианты перед продлением договора"),
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
          `خیر. تغییر تأمین‌کننده به معنی قطع ${n} نیست. تأمین ${n} خانه از طریق شبکه ادامه پیدا می‌کند و فقط شرکت طرف قرارداد تغییر می‌کند.`,
          "Nein. Ein Anbieterwechsel bedeutet keine Unterbrechung. Die Versorgung läuft weiter über das Netz — nur der Vertragspartner ändert sich.",
          `Нет. Смена поставщика не означает отключения ${r.whatGen}. Снабжение дома продолжается через сеть — меняется только компания, с которой у вас договор.`
        ),
      },
      {
        q: t("اگر هنوز قرارداد فعلی‌ام تمام نشده باشد، می‌توانم تغییرش بدهم؟", "Kann ich wechseln, wenn mein aktueller Vertrag noch läuft?", "Можно ли сменить поставщика, если текущий договор ещё не закончился?"),
        a: t(
          "باید شرایط قرارداد فعلی، مدت قرارداد و Kündigungsfrist بررسی شود. تیم تعرفه می‌تواند این موارد را بررسی کند و زمان مناسب برای تغییر را مشخص کند.",
          "Vertragsbedingungen, Laufzeit und Kündigungsfrist müssen geprüft werden. Das Tarefe-Team kann das übernehmen und den passenden Zeitpunkt für den Wechsel bestimmen.",
          "Нужно проверить условия текущего договора, его срок и Kündigungsfrist. Команда Tarefe может это сделать и определить подходящий момент для смены."
        ),
      },
      {
        q: t(`آیا تعرفه فقط ${P}preis را مقایسه می‌کند؟`, `Vergleicht Tarefe nur den ${P}preis?`, `Сравнивает ли Tarefe только цену ${r.whatGen}?`),
        a: t(
          "خیر. هنگام بررسی، مواردی مثل Arbeitspreis، Grundpreis، Preisgarantie، مدت قرارداد، شرایط فسخ و در صورت وجود Bonus هم در نظر گرفته می‌شوند.",
          "Nein. Bei der Prüfung werden unter anderem Arbeitspreis, Grundpreis, Preisgarantie, Vertragslaufzeit, Kündigungsbedingungen und — falls vorhanden — Boni berücksichtigt.",
          "Нет. При проверке учитываются в том числе Arbeitspreis, Grundpreis, Preisgarantie, срок договора, условия расторжения и — при наличии — бонусы."
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
      {
        q: t("آیا لازم است خودم با شرکت قبلی تماس بگیرم؟", "Muss ich selbst meinen bisherigen Anbieter kontaktieren?", "Нужно ли самому связываться с прежней компанией?"),
        a: t(
          "در صورت امکان و بسته به شرایط قرارداد، تیم تعرفه می‌تواند مراحل مربوط به تغییر و Kündigung را برایت پیگیری کند.",
          "Wenn möglich und je nach Vertragsbedingungen kann das Tarefe-Team die Schritte rund um Wechsel und Kündigung für Sie übernehmen.",
          "Если это возможно и в зависимости от условий договора, команда Tarefe может взять на себя шаги, связанные со сменой и Kündigung."
        ),
      },
      {
        q: t("برای بررسی تعرفه چه اطلاعاتی لازم است؟", "Welche Angaben werden für die Prüfung benötigt?", "Какие данные нужны для проверки тарифа?"),
        a: t(
          "معمولاً اطلاعاتی مثل PLZ، میزان مصرف سالانه و اطلاعات قرارداد فعلی کمک می‌کند گزینه‌ها دقیق‌تر بررسی شوند.",
          "In der Regel helfen Angaben wie Postleitzahl, Jahresverbrauch und Daten Ihres aktuellen Vertrags, die Optionen genauer zu prüfen.",
          "Обычно помогают такие данные, как PLZ, годовое потребление и сведения о текущем договоре — так варианты можно проверить точнее."
        ),
      },
    ],
  };
}

const CACHE: Partial<Record<EnergyKind, EnergyPageContent>> = {};

export function getEnergyPageContent(kind: EnergyKind): EnergyPageContent {
  return (CACHE[kind] ??= build(kind));
}
