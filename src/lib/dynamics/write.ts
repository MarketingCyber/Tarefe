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
