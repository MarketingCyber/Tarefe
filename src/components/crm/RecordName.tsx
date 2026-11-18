import { recordName } from "@/lib/dynamics/view";
import { getOpsI18n } from "@/lib/ops-i18n/server";

/**
 * An old-CRM record's name in the staff member's language, isolated as its own text direction (<bdi>) so a Persian
 * name inside an English page — or a Latin one in Persian — isn't scrambled with what's around it.
 */
export async function RecordName({ entity, data }: { entity: string; data: Record<string, unknown> }) {
  const { t, intl } = await getOpsI18n();
  return <bdi>{recordName(entity, data, t, intl)}</bdi>;
}
