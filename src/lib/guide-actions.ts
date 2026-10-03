"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./db";
import { parseGuideSources } from "./guide-body";
import { canAccessContent } from "./permissions";

/** Same content-role-check pattern as faq-actions.ts / testimonial-actions.ts. */
async function requireStaff() {
  const session = await auth();
  if (!session?.user || !canAccessContent(session.user.role)) return null;
  return session;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fieldsFrom(formData: FormData) {
  const verifiedAtRaw = (formData.get("verifiedAt") as string)?.trim();
  const sourcesRaw = (formData.get("sourcesText") as string) ?? "";
  return {
    titleFa: (formData.get("titleFa") as string)?.trim() ?? "",
    titleDe: (formData.get("titleDe") as string)?.trim() || null,
    titleRu: (formData.get("titleRu") as string)?.trim() || null,
    excerptFa: (formData.get("excerptFa") as string)?.trim() ?? "",
    excerptDe: (formData.get("excerptDe") as string)?.trim() || null,
    excerptRu: (formData.get("excerptRu") as string)?.trim() || null,
    bodyFa: (formData.get("bodyFa") as string)?.trim() ?? "",
    bodyDe: (formData.get("bodyDe") as string)?.trim() || null,
    bodyRu: (formData.get("bodyRu") as string)?.trim() || null,
    relatedCategory: (formData.get("relatedCategory") as string)?.trim() || null,
    relatedSubcategory: (formData.get("relatedSubcategory") as string)?.trim() || null,
    relatedProductType: (formData.get("relatedProductType") as string)?.trim() || null,
    verifiedAt: verifiedAtRaw ? new Date(verifiedAtRaw) : null,
    // Prisma's Json input type wants structural compatibility with
    // InputJsonValue, which a named GuideSource[] interface doesn't
    // satisfy on its own even though the runtime shape is identical —
    // this cast is just telling TS that, not widening what's stored.
    sources: parseGuideSources(sourcesRaw) as unknown as Prisma.InputJsonValue,
    published: formData.get("published") === "on",
  };
}

function revalidateGuidePublicPages(slug?: string) {
  for (const locale of ["fa", "de", "ru"]) {
    revalidatePath(`/${locale}/guides`);
    revalidatePath(`/${locale}`);
    if (slug) revalidatePath(`/${locale}/guides/${slug}`);
  }
}

export async function createGuide(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const slugInput = (formData.get("slug") as string)?.trim();
  const slug = slugify(slugInput);
  const fields = fieldsFrom(formData);
  if (!slug || !fields.titleFa || !fields.excerptFa || !fields.bodyFa) redirect("/ops/guides/new?error=missing_required");

  const existing = await prisma.guide.findUnique({ where: { slug } });
  if (existing) redirect("/ops/guides/new?error=slug_taken");

  const maxOrder = await prisma.guide.aggregate({ _max: { order: true } });
  await prisma.guide.create({ data: { ...fields, slug, order: (maxOrder._max.order ?? -1) + 1 } });

  revalidateGuidePublicPages(slug);
  redirect("/ops/guides");
}

export async function updateGuide(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const id = formData.get("id") as string;
  const fields = fieldsFrom(formData);
  if (!fields.titleFa || !fields.excerptFa || !fields.bodyFa) redirect(`/ops/guides/${id}?error=missing_required`);

  const guide = await prisma.guide.update({ where: { id }, data: fields });

  revalidateGuidePublicPages(guide.slug);
  redirect("/ops/guides");
}

export async function deleteGuide(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;
  const id = formData.get("id") as string;
  const guide = await prisma.guide.delete({ where: { id } });
  revalidateGuidePublicPages(guide.slug);
}

export async function toggleGuidePublished(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;
  const id = formData.get("id") as string;
  const published = formData.get("published") === "true";
  const guide = await prisma.guide.update({ where: { id }, data: { published: !published } });
  revalidateGuidePublicPages(guide.slug);
}

/** Swaps `order` with the adjacent item — same simple up/down pattern as faq-actions.ts's moveFaq. */
export async function moveGuide(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const id = formData.get("id") as string;
  const direction = formData.get("direction") as "up" | "down";

  const all = await prisma.guide.findMany({ orderBy: { order: "asc" }, select: { id: true, order: true } });
  const index = all.findIndex((g) => g.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= all.length) return;

  const current = all[index];
  const swapWith = all[swapIndex];
  await prisma.$transaction([
    prisma.guide.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    prisma.guide.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  revalidatePath("/ops/guides");
}
