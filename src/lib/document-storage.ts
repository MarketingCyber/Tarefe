import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Real file storage for the Document model, which until now had a
 * `fileUrl` column with no actual upload path anywhere in the app — see
 * src/app/app/documents/page.tsx, which could only ever show "در حال
 * آماده‌سازی" (preparing) since nothing ever set it.
 *
 * Stored on local disk, not S3/cloud storage: this is a single-VPS
 * deployment with no cloud storage credentials configured (same
 * constraint noted for Phase 12's monitoring gap) — local disk is the
 * honest, working option available right now, not a placeholder for a
 * "real" solution later.
 *
 * Deliberately OUTSIDE the Next.js app directory and never under
 * `public/` — these are contracts, ID documents, invoices. A guessable
 * `/uploads/xyz.pdf` URL would make every customer's private documents
 * world-readable to anyone who found or brute-forced a filename. Every
 * read goes through /api/documents/[id] (src/app/api/documents/[id]/route.ts),
 * which checks the requester is the document's owner or staff before
 * streaming anything.
 */
const UPLOAD_DIR = process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), "private-uploads");

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB — generous for a scanned contract/ID, not for arbitrary large files
export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export class UploadValidationError extends Error {}

/**
 * Saves an uploaded File to disk under a random, non-guessable name — the
 * original filename is never used for the on-disk path (avoids path
 * traversal and collisions), only kept as display metadata by the caller.
 */
export async function saveUploadedFile(file: File): Promise<{ storagePath: string; size: number }> {
  if (file.size === 0) throw new UploadValidationError("Empty file");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadValidationError(`File exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit`);
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new UploadValidationError(`Unsupported file type: ${file.type || "unknown"}`);

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[file.type] ?? "";
  const storagePath = `${randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, storagePath);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return { storagePath, size: buffer.byteLength };
}

/** `storagePath` must be exactly what saveUploadedFile returned — never accept this from user input, it's a filesystem path component. */
export async function readUploadedFile(storagePath: string): Promise<Buffer> {
  const fullPath = path.join(UPLOAD_DIR, storagePath);
  // Defense in depth against a corrupted/tampered storagePath ever reaching
  // here: resolve and confirm it's still inside UPLOAD_DIR before reading.
  if (!path.resolve(fullPath).startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    throw new Error("Resolved path escapes the upload directory");
  }
  return readFile(fullPath);
}

export async function deleteUploadedFile(storagePath: string): Promise<void> {
  const fullPath = path.join(UPLOAD_DIR, storagePath);
  if (!path.resolve(fullPath).startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return;
  await unlink(fullPath).catch(() => {
    // Already gone or never existed — deleting the DB row should still succeed.
  });
}

export function contentTypeFor(storagePath: string): string {
  const ext = path.extname(storagePath).toLowerCase();
  return { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" }[ext] ?? "application/octet-stream";
}

/**
 * App Home slider images (marketing, not private — served publicly by /api/v1/banners/[id]/image). Kept in their
 * own banners/ folder next to the documents so a banner file name can never point at a customer document.
 */
const BANNER_DIR = path.join(UPLOAD_DIR, "banners");
export const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const BANNER_TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

export async function saveBannerImage(file: File): Promise<string> {
  if (file.size === 0) throw new UploadValidationError("Empty file");
  if (file.size > MAX_BANNER_BYTES) throw new UploadValidationError("Image exceeds 5MB");
  const ext = BANNER_TYPES[file.type];
  if (!ext) throw new UploadValidationError(`Unsupported image type: ${file.type || "unknown"}`);
  await mkdir(BANNER_DIR, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(BANNER_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function readBannerImage(name: string): Promise<Buffer> {
  const full = path.join(BANNER_DIR, name);
  if (!path.resolve(full).startsWith(path.resolve(BANNER_DIR) + path.sep)) throw new Error("Resolved path escapes the banner directory");
  return readFile(full);
}

export async function deleteBannerImage(name: string): Promise<void> {
  const full = path.join(BANNER_DIR, name);
  if (!path.resolve(full).startsWith(path.resolve(BANNER_DIR) + path.sep)) return;
  await unlink(full).catch(() => undefined);
}
