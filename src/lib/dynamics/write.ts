import { prisma } from "@/lib/db";
import { crmGet, crmWrite } from "@/lib/dynamics/client";
import { mirrorReadPath, saveMirrorRecords } from "@/lib/dynamics/sync";

/**
 * Write-back from /ops to the old CRM (phase 2 of docs/crm-redesign/04-migration-plan.md): Dynamics stays the system of
 * record, so every change is written to Dynamics FIRST; only when it accepts, the record is read back and stored in
 * the mirror — operators see Dynamics' version, its rules applied (e.g. task subjects get a "Sonstig-" prefix).
 *
 * Switched by CRM_WRITES (server .env):
 *   unset / off → no write buttons at all (default)
 *   dry         → buttons work, nothing is sent to Dynamics (testing the screens)
 *   on          → real writes, with the CRM login in DYNAMICS_CRM_USER / _PASSWORD
 * Dynamics records every change under that one login, so notes carry the staff member's name in their title, and
 * every action is also in our activity log under the person who did it.
 */

export type WriteMode = "off" | "dry" | "on";
export const writeMode = (): WriteMode => (process.env.CRM_WRITES === "on" ? "on" : process.env.CRM_WRITES === "dry" ? "dry" : "off");

export class WriteRefused extends Error {}

const NOTE_TARGET: Record<string, { nav: string; set: string }> = {
  contact: { nav: "objectid_contact", set: "contacts" },
  opportunity: { nav: "objectid_opportunity", set: "opportunities" },
  incident: { nav: "objectid_incident", set: "incidents" },
  lead: { nav: "objectid_lead", set: "leads" },
};
export const NOTE_ENTITIES = Object.keys(NOTE_TARGET);

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function log(actorId: string, entityType: string, entityId: string, action: string, note: string) {
  await prisma.activityLog.create({ data: { actorId, entityType: `crm_${entityType}`, entityId: entityId.toLowerCase(), action, note } });
}

/** Marks an open old-CRM task (or phone call / appointment) completed. */
export async function closeActivity(entity: string, id: string, actor: { id: string; name: string }) {
  const mode = writeMode();
  if (mode === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  if (!["task", "phonecall", "appointment"].includes(entity) || !GUID.test(id)) throw new WriteRefused("رکورد نامعتبر است.");
  const current = await prisma.crmRecord.findFirst({ where: { entity, crmId: { equals: id, mode: "insensitive" }, deletedAt: null }, select: { state: true } });
  if (!current) throw new WriteRefused("این کار در CRM قدیم پیدا نشد.");
  if (current.state !== 0) throw new WriteRefused("این کار قبلاً بسته شده است.");

  if (mode === "on") {
    // Dynamics' "Completed" status: task 5, phone call 2 ("Made"), appointment 3.
    const statuscode = entity === "task" ? 5 : entity === "phonecall" ? 2 : 3;
    await crmWrite("PATCH", `${entity === "task" ? "tasks" : entity === "phonecall" ? "phonecalls" : "appointments"}(${id})`, { statecode: 1, statuscode });
    await saveMirrorRecords(entity, [await crmGet<Record<string, unknown>>(mirrorReadPath(entity, id))]);
  }
  await log(actor.id, entity, id, mode === "on" ? "closed" : "closed_dry_run", `Closed in the old CRM by ${actor.name}`);
}

/** Adds a note to an old-CRM customer, contract, ticket or lead. */
export async function addNote(entity: string, id: string, text: string, actor: { id: string; name: string }) {
  const mode = writeMode();
  if (mode === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  const target = NOTE_TARGET[entity];
  const body = text.trim();
  if (!target || !GUID.test(id)) throw new WriteRefused("رکورد نامعتبر است.");
  if (!body) throw new WriteRefused("متن یادداشت خالی است.");
  if (body.length > 5000) throw new WriteRefused("یادداشت بیشتر از ۵۰۰۰ نویسه است.");

  if (mode === "on") {
    const created = await crmWrite("POST", "annotations", {
      subject: `tarefe.de · ${actor.name}`,
      notetext: body,
      [`${target.nav}@odata.bind`]: `/${target.set}(${id})`,
    });
    const noteId = String(created.annotationid ?? "");
    if (GUID.test(noteId)) await saveMirrorRecords("annotation", [await crmGet<Record<string, unknown>>(mirrorReadPath("annotation", noteId))]);
  }
  await log(actor.id, entity, id, mode === "on" ? "note_added" : "note_added_dry_run", body.slice(0, 500));
}

// ---- Leads, assignment, follow-up calls, files (2026-11-14) -------------------------------------------------------

/** Dynamics lead stage («مرحله», new_status) values staff may set on an open lead; the closed / converted stages are set by closing or converting. */
export const LEAD_STAGES: [number, string][] = [
  [100000000, "ثبت شده"],
  [100000005, "هنوز جواب نداده"],
  [100000001, "تماس برقرار شده"],
  [100000002, "در دست بررسی"],
];
/** Follow-up reasons («وضعیت») of an open lead (statuscode with statecode 0). */
export const LEAD_OPEN_REASONS: [number, string][] = [
  [1, "New"],
  [100000000, "تلاش برای تماس"],
  [100000001, "درحال پیگیری"],
  [100000002, "تماس در آینده"],
  [2, "Contacted"],
  [100000003, "عدم نیاز"],
  [100000004, "عدم امکان تماس"],
  [100000005, "خرید از رقبا"],
  [100000006, "تکراری"],
  [100000007, "لغو"],
];
/** Reasons a lead is closed with (statuscode with statecode 2, "disqualified"). */
export const LEAD_CLOSE_REASONS: [number, string][] = [
  [4, "شماره اشتباه است"],
  [5, "جواب نداد-تکراری بود"],
  [6, "اصلا نمیدونست برای چی شما شو کذاشته"],
  [7, "سوال بیربط غیر فروش داشت"],
  [100000008, "انگبوت از سمت مشتریان خودمون بود"],
];
const LEAD_CLOSED_STAGE = 100000004; // «بسته شده»

const ENTITY_SET: Record<string, string> = { lead: "leads", contact: "contacts", opportunity: "opportunities", incident: "incidents" };
const allowed = (list: [number, string][], v: number) => list.some(([value]) => value === v);

async function openLead(id: string) {
  if (!GUID.test(id)) throw new WriteRefused("رکورد نامعتبر است.");
  const lead = await prisma.crmRecord.findFirst({ where: { entity: "lead", crmId: { equals: id, mode: "insensitive" }, deletedAt: null }, select: { state: true } });
  if (!lead) throw new WriteRefused("این سرنخ در CRM قدیم پیدا نشد.");
  if (lead.state !== 0) throw new WriteRefused("این سرنخ باز نیست (بسته یا تبدیل شده).");
}

async function writeAndReadBack(entity: string, id: string, body: Record<string, unknown>) {
  await crmWrite("PATCH", `${ENTITY_SET[entity]}(${id})`, body);
  await saveMirrorRecords(entity, [await crmGet<Record<string, unknown>>(mirrorReadPath(entity, id))]);
}

/** Changes an open lead's stage and / or follow-up reason. */
export async function updateLead(id: string, change: { stage?: number; reason?: number }, actor: { id: string; name: string }) {
  const mode = writeMode();
  if (mode === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  await openLead(id);
  const body: Record<string, unknown> = {};
  if (change.stage !== undefined) {
    if (!allowed(LEAD_STAGES, change.stage)) throw new WriteRefused("مرحله نامعتبر است.");
    body.new_status = change.stage;
  }
  if (change.reason !== undefined) {
    if (!allowed(LEAD_OPEN_REASONS, change.reason)) throw new WriteRefused("وضعیت نامعتبر است.");
    body.statuscode = change.reason;
  }
  if (!Object.keys(body).length) throw new WriteRefused("تغییری انتخاب نشده.");
  if (mode === "on") await writeAndReadBack("lead", id, body);
  const label = [
    change.stage !== undefined ? LEAD_STAGES.find(([v]) => v === change.stage)?.[1] : null,
    change.reason !== undefined ? LEAD_OPEN_REASONS.find(([v]) => v === change.reason)?.[1] : null,
  ]
    .filter(Boolean)
    .join(" / ");
  await log(actor.id, "lead", id, mode === "on" ? "lead_updated" : "lead_updated_dry_run", `Lead set to ${label} by ${actor.name}`);
}

/** Closes an open lead with one of the closing reasons of Dynamics (and an optional explanation). */
export async function closeLead(id: string, reason: number, explanation: string, actor: { id: string; name: string }) {
  const mode = writeMode();
  if (mode === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  await openLead(id);
  if (!allowed(LEAD_CLOSE_REASONS, reason)) throw new WriteRefused("دلیل بستن را انتخاب کنید.");
  const text = explanation.trim().slice(0, 2000);
  if (mode === "on") {
    await writeAndReadBack("lead", id, { statecode: 2, statuscode: reason, new_status: LEAD_CLOSED_STAGE, ...(text ? { new_disqualified_desc: text } : {}) });
  }
  const label = LEAD_CLOSE_REASONS.find(([v]) => v === reason)?.[1];
  await log(actor.id, "lead", id, mode === "on" ? "lead_closed" : "lead_closed_dry_run", `Lead closed (${label}) by ${actor.name}${text ? `: ${text.slice(0, 300)}` : ""}`);
}

/** Old-CRM users records can be assigned to: active people, not system / integration accounts. */
export async function assignableUsers(): Promise<{ id: string; name: string }[]> {
  const rows = await prisma.crmRecord.findMany({ where: { entity: "systemuser", deletedAt: null }, select: { crmId: true, data: true } });
  return rows
    .map((r) => {
      const d = r.data as Record<string, unknown>;
      return { id: r.crmId.toLowerCase(), name: String(d.fullname ?? ""), disabled: d.isdisabled === true };
    })
    .filter((u) => !u.disabled && u.name && !/^(system administrator|tarefe site2?|tarefe ai|tarefe app|german test|integration|system)$/i.test(u.name))
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Assigns a lead / customer / contract / ticket to another old-CRM user. */
export async function assignRecord(entity: string, id: string, userId: string, actor: { id: string; name: string }) {
  const mode = writeMode();
  if (mode === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  if (!ENTITY_SET[entity] || !GUID.test(id) || !GUID.test(userId)) throw new WriteRefused("رکورد نامعتبر است.");
  const user = (await assignableUsers()).find((u) => u.id === userId.toLowerCase());
  if (!user) throw new WriteRefused("این کاربر در CRM قدیم فعال نیست.");
  if (mode === "on") await writeAndReadBack(entity, id, { "ownerid@odata.bind": `/systemusers(${user.id})` });
  await log(actor.id, entity, id, mode === "on" ? "assigned" : "assigned_dry_run", `Assigned to ${user.name} by ${actor.name}`);
}

/** Schedules a follow-up phone call (a Dynamics phone call activity) on a lead / customer / contract / ticket, for an old-CRM user. */
export async function scheduleCall(entity: string, id: string, input: { dueAt: Date; ownerId: string; subject: string }, actor: { id: string; name: string }) {
  const mode = writeMode();
  if (mode === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  if (!ENTITY_SET[entity] || !GUID.test(id) || !GUID.test(input.ownerId)) throw new WriteRefused("رکورد نامعتبر است.");
  if (Number.isNaN(input.dueAt.getTime()) || input.dueAt.getTime() < Date.now() - 86_400_000) throw new WriteRefused("تاریخ تماس را درست انتخاب کنید.");
  const owner = (await assignableUsers()).find((u) => u.id === input.ownerId.toLowerCase());
  if (!owner) throw new WriteRefused("این کاربر در CRM قدیم فعال نیست.");
  const subject = (input.subject.trim() || "تماس پیگیری").slice(0, 200);
  if (mode === "on") {
    const created = await crmWrite("POST", "phonecalls", {
      subject,
      description: `ثبت از tarefe.de · ${actor.name}`,
      scheduledend: input.dueAt.toISOString(),
      directioncode: true, // outgoing
      [`regardingobjectid_${entity}_phonecall@odata.bind`]: `/${ENTITY_SET[entity]}(${id})`,
      "ownerid@odata.bind": `/systemusers(${owner.id})`,
    });
    const callId = String(created.activityid ?? "");
    if (GUID.test(callId)) await saveMirrorRecords("phonecall", [await crmGet<Record<string, unknown>>(mirrorReadPath("phonecall", callId))]);
  }
  await log(actor.id, entity, id, mode === "on" ? "call_scheduled" : "call_scheduled_dry_run", `Call «${subject}» for ${owner.name} on ${input.dueAt.toISOString().slice(0, 16)} by ${actor.name}`);
}

/** Largest file Dynamics accepts as a note attachment with its default settings (5 MB). */
export const MAX_CRM_FILE_BYTES = 5 * 1024 * 1024;
const CRM_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

/** Attaches a file to a lead / customer / contract / ticket as a Dynamics note with a document, like operators do there. */
export async function uploadFile(entity: string, id: string, file: File, note: string, actor: { id: string; name: string }) {
  const mode = writeMode();
  if (mode === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  const target = NOTE_TARGET[entity];
  if (!target || !GUID.test(id)) throw new WriteRefused("رکورد نامعتبر است.");
  if (!file || file.size === 0) throw new WriteRefused("فایلی انتخاب نشده.");
  if (file.size > MAX_CRM_FILE_BYTES) throw new WriteRefused("فایل بزرگ‌تر از ۵ مگابایت است.");
  if (!CRM_FILE_TYPES.includes(file.type)) throw new WriteRefused("فقط PDF یا عکس (JPG، PNG، WEBP، HEIC).");
  const filename = file.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 200) || "file";
  if (mode === "on") {
    const created = await crmWrite("POST", "annotations", {
      subject: `tarefe.de · ${actor.name}`,
      notetext: note.trim().slice(0, 2000) || filename,
      filename,
      mimetype: file.type,
      documentbody: Buffer.from(await file.arrayBuffer()).toString("base64"),
      [`${target.nav}@odata.bind`]: `/${target.set}(${id})`,
    });
    const noteId = String(created.annotationid ?? "");
    if (GUID.test(noteId)) await saveMirrorRecords("annotation", [await crmGet<Record<string, unknown>>(mirrorReadPath("annotation", noteId))]);
  }
  await log(actor.id, entity, id, mode === "on" ? "file_uploaded" : "file_uploaded_dry_run", `File ${filename} (${Math.round(file.size / 1024)} KB) by ${actor.name}`);
}

// ---- Call results and converting leads (2026-11-15) ---------------------------------------------------------------

export type CallResult = "no_answer" | "call_back" | "interested" | "not_interested" | "wrong_number";
export const CALL_RESULTS: [CallResult, string][] = [
  ["no_answer", "جواب نداد"],
  ["call_back", "بعداً تماس بگیریم"],
  ["interested", "علاقه‌مند است"],
  ["not_interested", "علاقه‌ای ندارد"],
  ["wrong_number", "شماره اشتباه"],
];

/**
 * One click after a call («نتیجه تماس»): the call is logged in Dynamics as a completed phone call (a planned call from
 * the call list is completed itself), and for a lead its stage / follow-up / state follow the result:
 *   no answer → «هنوز جواب نداده» / «تلاش برای تماس», next call tomorrow;
 *   call back → «تماس برقرار شده» / «تماس در آینده», next call at the chosen time;
 *   interested → «در دست بررسی» / «درحال پیگیری»;   not interested → follow-up «عدم نیاز»;
 *   wrong number → the lead is closed with «شماره اشتباه است».
 * The next call goes to the operator (their old-CRM user, «کارهای من»), else to the record's owner.
 */
export async function logCallResult(
  input: { entity: string; id: string; result: CallResult; callId?: string | null; nextAt?: Date | null; note?: string },
  actor: { id: string; name: string; crmUserId?: string | null },
) {
  const mode = writeMode();
  if (mode === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  const { entity, id, result } = input;
  if (!ENTITY_SET[entity] || !GUID.test(id)) throw new WriteRefused("رکورد نامعتبر است.");
  const label = CALL_RESULTS.find(([r]) => r === result)?.[1];
  if (!label) throw new WriteRefused("نتیجه تماس را انتخاب کنید.");
  if (result === "call_back" && (!input.nextAt || Number.isNaN(input.nextAt.getTime()))) throw new WriteRefused("زمان تماس بعدی را انتخاب کنید.");
  const note = (input.note ?? "").trim().slice(0, 2000);

  const record = await prisma.crmRecord.findFirst({ where: { entity, crmId: { equals: id, mode: "insensitive" }, deletedAt: null }, select: { state: true, ownerId: true } });
  if (!record) throw new WriteRefused("رکورد در CRM قدیم پیدا نشد.");
  const users = await assignableUsers();
  const caller = users.find((u) => u.id === actor.crmUserId?.toLowerCase()) ?? null;
  const description = [`نتیجه: ${label}`, note, `ثبت از tarefe.de · ${actor.name}`].filter(Boolean).join("\n");

  if (mode === "on") {
    let callId = input.callId && GUID.test(input.callId) ? input.callId : null;
    if (callId) {
      await crmWrite("PATCH", `phonecalls(${callId})`, { description, actualend: new Date().toISOString() });
    } else {
      const created = await crmWrite("POST", "phonecalls", {
        subject: `تماس — ${label}`,
        description,
        directioncode: true,
        actualend: new Date().toISOString(),
        [`regardingobjectid_${entity}_phonecall@odata.bind`]: `/${ENTITY_SET[entity]}(${id})`,
        ...(caller ? { "ownerid@odata.bind": `/systemusers(${caller.id})` } : {}),
      });
      callId = String(created.activityid ?? "");
    }
    if (GUID.test(callId)) {
      await crmWrite("PATCH", `phonecalls(${callId})`, { statecode: 1, statuscode: 2 }); // completed («Made»)
      await saveMirrorRecords("phonecall", [await crmGet<Record<string, unknown>>(mirrorReadPath("phonecall", callId))]);
    }
  }
  await log(actor.id, entity, id, mode === "on" ? "call_logged" : "call_logged_dry_run", `Call: ${label}${note ? ` — ${note.slice(0, 200)}` : ""} (${actor.name})`);

  if (entity === "lead" && record.state === 0) {
    if (result === "no_answer") await updateLead(id, { stage: 100000005, reason: 100000000 }, actor);
    if (result === "call_back") await updateLead(id, { stage: 100000001, reason: 100000002 }, actor);
    if (result === "interested") await updateLead(id, { stage: 100000002, reason: 100000001 }, actor);
    if (result === "not_interested") await updateLead(id, { reason: 100000003 }, actor);
    if (result === "wrong_number") await closeLead(id, 4, note, actor);
  }

  const nextAt = result === "call_back" ? input.nextAt! : result === "no_answer" ? new Date(Date.now() + 86_400_000) : null;
  const nextOwner = caller?.id ?? (users.some((u) => u.id === record.ownerId) ? record.ownerId : null);
  if (nextAt && nextOwner) await scheduleCall(entity, id, { dueAt: nextAt, ownerId: nextOwner, subject: result === "no_answer" ? "تماس دوباره (جواب نداد)" : "تماس بعدی" }, actor);
  return { nextScheduled: !!(nextAt && nextOwner) };
}

/**
 * Converts an open lead into a contract with Dynamics' own «Qualify» (QualifyLead): Dynamics creates the contract
 * (opportunity) with its lead mapping and runs its automations, as when operators do it there. The contract is for
 * the lead's customer when it has one, else the one customer with its phone / e-mail, else Dynamics creates a new
 * customer from the lead. Returns the new contract's id.
 */
export async function qualifyLead(id: string, actor: { id: string; name: string }): Promise<{ contractId: string | null; customer: "existing" | "new" }> {
  const mode = writeMode();
  if (mode === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  await openLead(id);
  const lead = await prisma.crmRecord.findFirst({ where: { entity: "lead", crmId: { equals: id, mode: "insensitive" } }, select: { data: true } });
  const d = (lead?.data ?? {}) as Record<string, unknown>;
  let contactId = [d._parentcontactid_value, d._customerid_value].find((v): v is string => typeof v === "string" && GUID.test(v)) ?? null;
  if (!contactId) {
    const { personKeys } = await import("@/lib/dynamics/identity");
    for (const key of personKeys(d)) {
      const matches = await prisma.crmRecord.findMany({ where: { entity: "contact", deletedAt: null, refs: { has: key } }, select: { crmId: true }, take: 2 });
      if (matches.length === 1) {
        contactId = matches[0].crmId.toLowerCase();
        break;
      }
    }
  }
  const currency =
    (typeof d._transactioncurrencyid_value === "string" && d._transactioncurrencyid_value) ||
    ((await prisma.crmRecord.findFirst({ where: { entity: "opportunity", deletedAt: null }, select: { data: true }, orderBy: { crmModifiedAt: "desc" } }))?.data as Record<string, unknown> | undefined)
      ?._transactioncurrencyid_value;

  let contractId: string | null = null;
  if (mode === "on") {
    const created = await crmWrite<{ value?: Record<string, unknown>[] }>("POST", `leads(${id})/Microsoft.Dynamics.CRM.QualifyLead`, {
      CreateAccount: false,
      CreateContact: !contactId,
      CreateOpportunity: true,
      Status: 3, // «Qualified»
      ...(contactId ? { OpportunityCustomerId: { "@odata.type": "Microsoft.Dynamics.CRM.contact", contactid: contactId } } : {}),
      ...(typeof currency === "string" && GUID.test(currency)
        ? { OpportunityCurrencyId: { "@odata.type": "Microsoft.Dynamics.CRM.transactioncurrency", transactioncurrencyid: currency } }
        : {}),
    });
    for (const ref of created.value ?? []) {
      const type = String(ref["@odata.type"] ?? "");
      if (type.endsWith("opportunity") && typeof ref.opportunityid === "string") contractId = ref.opportunityid.toLowerCase();
      if (type.endsWith("contact") && typeof ref.contactid === "string") await saveMirrorRecords("contact", [await crmGet<Record<string, unknown>>(mirrorReadPath("contact", ref.contactid))]);
    }
    await saveMirrorRecords("lead", [await crmGet<Record<string, unknown>>(mirrorReadPath("lead", id))]);
    if (contractId) await saveMirrorRecords("opportunity", [await crmGet<Record<string, unknown>>(mirrorReadPath("opportunity", contractId))]);
  }
  await log(actor.id, "lead", id, mode === "on" ? "lead_qualified" : "lead_qualified_dry_run", `Converted to a contract by ${actor.name}${contactId ? " (existing customer)" : " (new customer)"}`);
  return { contractId, customer: contactId ? "existing" : "new" };
}
