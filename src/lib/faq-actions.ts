"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { prisma } from "./db";
import { canAccessContent } from "./permissions";

/**
 * CMS content Server Actions (Phase 9's first content type). CONTENT_EDITOR
 * added 2026-10-01 (the plan's 6.4 finally landed) — canAccessContent()
 * covers it plus ADVISOR/ADMIN, same content-role-check pattern as every
 * other content mutation in this codebase (see e.g. src/lib/guide-actions.ts).
 */
async function requireStaff() {
  const session = await auth();
  if (!session?.user || !canAccessContent(session.user.role)) return null;
  return session;
}

function fieldsFrom(formData: FormData) {
  return {
    questionFa: (formData.get("questionFa") as string)?.trim() ?? "",
    questionDe: (formData.get("questionDe") as string)?.trim() ?? "",
    questionRu: (formData.get("questionRu") as string)?.trim() ?? "",
    answerFa: (formData.get("answerFa") as string)?.trim() ?? "",
    answerDe: (formData.get("answerDe") as string)?.trim() ?? "",
    answerRu: (formData.get("answerRu") as string)?.trim() ?? "",
    published: formData.get("published") === "on",
  };
}

export async function createFaq(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const fields = fieldsFrom(formData);
  if (!fields.questionFa || !fields.answerFa) redirect("/ops/faq/new?error=missing_fa");

  const maxOrder = await prisma.faqItem.aggregate({ _max: { order: true } });
  await prisma.faqItem.create({ data: { ...fields, order: (maxOrder._max.order ?? -1) + 1 } });

  revalidatePath("/ops/faq");
  revalidateFaqPublicPages();
  redirect("/ops/faq");
}

export async function updateFaq(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const id = formData.get("id") as string;
  const fields = fieldsFrom(formData);
  if (!fields.questionFa || !fields.answerFa) redirect(`/ops/faq/${id}?error=missing_fa`);

  await prisma.faqItem.update({ where: { id }, data: fields });

  revalidatePath("/ops/faq");
  revalidateFaqPublicPages();
  redirect("/ops/faq");
}

export async function deleteFaq(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;
  const id = formData.get("id") as string;
  await prisma.faqItem.delete({ where: { id } });
  revalidatePath("/ops/faq");
  revalidateFaqPublicPages();
}

export async function toggleFaqPublished(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;
  const id = formData.get("id") as string;
  const published = formData.get("published") === "true";
  await prisma.faqItem.update({ where: { id }, data: { published: !published } });
  revalidatePath("/ops/faq");
  revalidateFaqPublicPages();
}

/** Swaps `order` with the adjacent item — simple up/down reordering, no drag-and-drop (see schema.prisma's FaqItem comment). */
export async function moveFaq(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const id = formData.get("id") as string;
  const direction = formData.get("direction") as "up" | "down";

  const all = await prisma.faqItem.findMany({ orderBy: { order: "asc" }, select: { id: true, order: true } });
  const index = all.findIndex((f) => f.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= all.length) return;

  const current = all[index];
  const swapWith = all[swapIndex];
  await prisma.$transaction([
    prisma.faqItem.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    prisma.faqItem.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  revalidatePath("/ops/faq");
  revalidateFaqPublicPages();
}

function revalidateFaqPublicPages() {
  for (const locale of ["fa", "de", "ru"]) {
    revalidatePath(`/${locale}/faq`);
    revalidatePath(`/${locale}`);
  }
}
