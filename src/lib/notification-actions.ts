"use server";

import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { prisma } from "./db";

export async function markNotificationRead(notificationId: string, path: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  // Scope the update to the current user — without this a signed-in user
  // could pass any notification id and mark someone else's as read.
  await prisma.notification.updateMany({ where: { id: notificationId, userId: session.user.id }, data: { read: true } });
  revalidatePath(path);
}

export async function markAllNotificationsRead(path: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } });
  revalidatePath(path);
}
