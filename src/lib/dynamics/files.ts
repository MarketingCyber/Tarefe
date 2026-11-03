import { prisma } from "@/lib/db";
import { crmGet, CrmError } from "@/lib/dynamics/client";
import { saveCrmFile } from "@/lib/document-storage";

/**
 * Copies the files attached to old-CRM notes (Dynamics annotations with a document) into the site's private upload
 * directory, a few per sync round in the time left after the record sync, so the CRM server isn't loaded while
 * operators work. The mirror's annotation rows leave the file bytes out (documentbody, ~0.7 GB); each file is read
 * once by id here. A note changed in Dynamics after its file was copied is copied again.
 *
 * Many notes are flagged as documents with no file (size 0) — those are plain notes and are skipped.
 */

type Pending = { crmId: string; crmModifiedAt: Date | null };

/** Notes with a file that isn't copied yet, or changed since it was copied. */
function pending(limit: number) {
  return prisma.$queryRaw<Pending[]>`
    SELECT r."crmId", r."crmModifiedAt" FROM crm_records r
    LEFT JOIN crm_files f ON f."annotationId" = lower(r."crmId")
    WHERE r.entity = 'annotation' AND r."deletedAt" IS NULL AND r.data->>'isdocument' = 'true'
      AND (r.data->>'filesize') ~ '^[0-9]+$' AND (r.data->>'filesize')::bigint > 0
      AND (f."annotationId" IS NULL OR r."crmModifiedAt" > f."crmModifiedAt")
    ORDER BY r."crmModifiedAt" DESC NULLS LAST
    LIMIT ${limit}`;
}

/** Copies files until the deadline; returns how many were copied. */
export async function syncAttachments(deadline: number): Promise<number> {
  let copied = 0;
  while (Date.now() < deadline) {
    const batch = await pending(10);
    if (!batch.length) break;
    for (const note of batch) {
      if (Date.now() > deadline) return copied;
      const id = note.crmId.toLowerCase();
      try {
        const f = await crmGet<{ documentbody?: string; filename?: string; mimetype?: string }>(
          `annotations(${id})?$select=documentbody,filename,mimetype`,
        );
        const data = Buffer.from(f.documentbody ?? "", "base64");
        const storagePath = await saveCrmFile(id, data);
        const row = { fileName: f.filename?.trim() || "file", mimeType: f.mimetype || null, size: data.length, storagePath, crmModifiedAt: note.crmModifiedAt };
        await prisma.crmFile.upsert({ where: { annotationId: id }, create: { annotationId: id, ...row }, update: row });
        copied++;
      } catch (error) {
        // A note deleted in Dynamics since the last round: the next sync marks it deleted and it drops out.
        if (error instanceof CrmError && error.status === 404) continue;
        throw error;
      }
    }
  }
  return copied;
}

/** For the nightly check: notes with a file in the mirror vs. files copied and up to date. */
export async function attachmentCounts() {
  const [row] = await prisma.$queryRaw<{ expected: bigint; copied: bigint }[]>`
    SELECT count(*) AS expected, count(f."annotationId") FILTER (WHERE r."crmModifiedAt" <= f."crmModifiedAt" OR r."crmModifiedAt" IS NULL) AS copied
    FROM crm_records r LEFT JOIN crm_files f ON f."annotationId" = lower(r."crmId")
    WHERE r.entity = 'annotation' AND r."deletedAt" IS NULL AND r.data->>'isdocument' = 'true'
      AND (r.data->>'filesize') ~ '^[0-9]+$' AND (r.data->>'filesize')::bigint > 0`;
  return { expected: Number(row?.expected ?? 0), copied: Number(row?.copied ?? 0) };
}
