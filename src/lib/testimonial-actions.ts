"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { prisma } from "./db";
import { canAccessContent } from "./permissions";

/** Same content-role-check pattern as faq-actions.ts. */
async function requireStaff() {
  const session = await auth();
  if (!session?.user || !canAccessContent(session.user.role)) return null;
  return session;
}

function fieldsFrom(formData: FormData) {
  const ratingRaw = (formData.get("rating") as string)?.trim();
  return {
    customerName: (formData.get("customerName") as string)?.trim() ?? "",
    customerNameLatin: (formData.get("customerNameLatin") as string)?.trim() || null,
    quoteFa: (formData.get("quoteFa") as string)?.trim() ?? "",
    quoteDe: (formData.get("quoteDe") as string)?.trim() || null,
    quoteRu: (formData.get("quoteRu") as string)?.trim() || null,
    serviceLabel: (formData.get("serviceLabel") as string)?.trim() || null,
    serviceLabelDe: (formData.get("serviceLabelDe") as string)?.trim() || null,
    serviceLabelRu: (formData.get("serviceLabelRu") as string)?.trim() || null,
    rating: ratingRaw ? Number(ratingRaw) : null,
    consentNote: (formData.get("consentNote") as string)?.trim() || null,
    published: formData.get("published") === "on",
  };
}

export async function createTestimonial(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const fields = fieldsFrom(formData);
  if (!fields.customerName || !fields.quoteFa) redirect("/ops/testimonials/new?error=missing_required");

  const maxOrder = await prisma.testimonial.aggregate({ _max: { order: true } });
  await prisma.testimonial.create({ data: { ...fields, order: (maxOrder._max.order ?? -1) + 1 } });

  revalidatePath("/ops/testimonials");
  revalidatePath("/fa");
  revalidatePath("/de");
  revalidatePath("/ru");
  redirect("/ops/testimonials");
}

export async function updateTestimonial(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const id = formData.get("id") as string;
  const fields = fieldsFrom(formData);
  if (!fields.customerName || !fields.quoteFa) redirect(`/ops/testimonials/${id}?error=missing_required`);

  await prisma.testimonial.update({ where: { id }, data: fields });

  revalidatePath("/ops/testimonials");
  revalidatePath("/fa");
  revalidatePath("/de");
  revalidatePath("/ru");
  redirect("/ops/testimonials");
}

export async function deleteTestimonial(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;
  const id = formData.get("id") as string;
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/ops/testimonials");
  revalidatePath("/fa");
  revalidatePath("/de");
  revalidatePath("/ru");
}

export async function toggleTestimonialPublished(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;
  const id = formData.get("id") as string;
  const published = formData.get("published") === "true";
  await prisma.testimonial.update({ where: { id }, data: { published: !published } });
  revalidatePath("/ops/testimonials");
  revalidatePath("/fa");
  revalidatePath("/de");
  revalidatePath("/ru");
}

/** Swaps `order` with the adjacent item — same simple up/down pattern as faq-actions.ts's moveFaq. */
export async function moveTestimonial(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const id = formData.get("id") as string;
  const direction = formData.get("direction") as "up" | "down";

  const all = await prisma.testimonial.findMany({ orderBy: { order: "asc" }, select: { id: true, order: true } });
  const index = all.findIndex((t) => t.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= all.length) return;

  const current = all[index];
  const swapWith = all[swapIndex];
  await prisma.$transaction([
    prisma.testimonial.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    prisma.testimonial.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  revalidatePath("/ops/testimonials");
}
