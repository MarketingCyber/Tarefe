import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { kuendigungsfrist } from "@/lib/automations/kuendigungsfrist";

/**
 * Old-CRM automations rebuilt in test mode (phase 3 of docs/crm-redesign/04-migration-plan.md). Each automation
 * says, for a Berlin day, what our code WOULD do (planned from the mirror before Dynamics runs) and what Dynamics
 * DID (read from the mirror afterwards); the runner stores both and the comparison in automation_runs. Nothing is
 * ever written to Dynamics — the point is to see every automation match Dynamics for a while before it takes over.
 *
 * Called after every sync round (POST /api/internal/crm-sync): it plans each automation once in its window before
 * Dynamics' run and checks it once the mirror has caught up after it. Cheap when there's nothing to do.
 */

/** One action an automation would take / Dynamics took, keyed by the record it's about. */
export type Action = { key: string; name: string; fields: Record<string, string | number | null> };

export type Automation = {
  key: string;
  label: string;
  description: string;
  /** Berlin hour from which to plan (must be before Dynamics' run) and from which to check (after it + sync lag). */
  planFromHour: number;
  checkFromHour: number;
  /** Fields compared between expected and actual (others are shown for context only). */
  compare: string[];
  plan: (day: string) => Promise<Action[]>;
  actual: (day: string) => Promise<Action[]>;
};

export const AUTOMATIONS: Automation[] = [kuendigungsfrist];

export type RunResult = {
  matched: { key: string; name: string }[];
  mismatched: { key: string; name: string; diffs: { field: string; expected: unknown; actual: unknown }[] }[];
  missing: Action[]; // we'd have done it, Dynamics didn't
  extra: Action[]; // Dynamics did it, we wouldn't have
};

const BERLIN = "Europe/Berlin";
export const berlinDay = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: BERLIN }).format(d);
const berlinHour = (d = new Date()) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: BERLIN, hour: "2-digit", hourCycle: "h23" }).format(d));

export function compareActions(automation: Automation, expected: Action[], actual: Action[]): RunResult {
  const byKey = new Map(actual.map((a) => [a.key, a]));
  const result: RunResult = { matched: [], mismatched: [], missing: [], extra: [] };
  for (const e of expected) {
    const a = byKey.get(e.key);
    if (!a) {
      result.missing.push(e);
      continue;
    }
    byKey.delete(e.key);
    const diffs = automation.compare.filter((f) => (e.fields[f] ?? null) !== (a.fields[f] ?? null)).map((f) => ({ field: f, expected: e.fields[f] ?? null, actual: a.fields[f] ?? null }));
    if (diffs.length) result.mismatched.push({ key: e.key, name: e.name, diffs });
    else result.matched.push({ key: e.key, name: e.name });
  }
  result.extra = [...byKey.values()];
  return result;
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Plans and checks whatever is due right now. Returns a short log of what it did. */
export async function runShadows(now = new Date()): Promise<string[]> {
  const day = berlinDay(now);
  const hour = berlinHour(now);
  const log: string[] = [];
  for (const a of AUTOMATIONS) {
    const run = await prisma.automationRun.findUnique({ where: { automation_day: { automation: a.key, day } } });
    if (!run && hour >= a.planFromHour && hour < a.checkFromHour - 1) {
      const expected = await a.plan(day);
      await prisma.automationRun.create({ data: { automation: a.key, day, expected: json(expected) } });
      log.push(`${a.key} ${day}: planned ${expected.length}`);
    } else if (run && !run.checkedAt && hour >= a.checkFromHour) {
      const result = compareActions(a, run.expected as Action[], await a.actual(day));
      await prisma.automationRun.update({ where: { id: run.id }, data: { checkedAt: new Date(), result: json(result) } });
      log.push(`${a.key} ${day}: ${result.matched.length} matched, ${result.mismatched.length} different, ${result.missing.length} missing, ${result.extra.length} extra`);
    }
  }
  return log;
}

/**
 * Fills past days from today's data (marked retro: statuses may have changed since, so "missing" and "extra" there
 * are hints, not proof). Days that already have a run are left alone.
 */
export async function backfillShadows(days: number): Promise<string[]> {
  const log: string[] = [];
  for (const a of AUTOMATIONS) {
    for (let i = days; i >= 1; i--) {
      const day = berlinDay(new Date(Date.now() - i * 86_400_000));
      if (await prisma.automationRun.findUnique({ where: { automation_day: { automation: a.key, day } } })) continue;
      const expected = await a.plan(day);
      const result = compareActions(a, expected, await a.actual(day));
      await prisma.automationRun.create({ data: { automation: a.key, day, retro: true, expected: json(expected), checkedAt: new Date(), result: json(result) } });
      log.push(`${a.key} ${day}: ${result.matched.length}/${expected.length} matched (retro)`);
    }
  }
  return log;
}
