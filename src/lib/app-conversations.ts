import type { Contract, Conversation, Message, ServiceRequest, User, Document } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/taxonomy";
import { describeService, providerInitials, requestStep, STATUS_WORDS, ticketNumber } from "@/lib/app-api";

/**
 * Per-contract support for the mobile app: every contract has its own conversation and its own requests, plus
 * one "general" conversation (contractId null). Conversations are created on demand the first time the app
 * lists them, so existing customers and contracts need no migration step.
 */

export const GENERAL_TITLE: Record<Locale, string> = {
  fa: "سوال کلی یا خدمت جدید",
  de: "Allgemeine Frage oder neues Angebot",
  ru: "Общий вопрос или новая услуга",
};

const DAY = 24 * 60 * 60 * 1000;

export function serializeContract(c: Contract, locale: Locale) {
  const { kind, serviceName } = describeService(c.category, locale);
  return {
    id: c.id,
    kind,
    category: c.category,
    serviceName,
    provider: c.provider,
    productName: c.productName,
    logo: providerInitials(c.provider),
    priceMonthly: c.priceMonthly,
    status: c.status,
    contractNumber: c.contractNumber,
    startDate: c.startDate,
    endDate: c.endDate,
    cancellationDeadline: c.cancellationDeadline,
    daysToDeadline: c.cancellationDeadline ? Math.ceil((c.cancellationDeadline.getTime() - Date.now()) / DAY) : null,
  };
}

/** Makes sure the customer has one conversation per (non-cancelled) contract and one general conversation. */
export async function ensureConversations(customerId: string): Promise<void> {
  const [contracts, existing] = await Promise.all([
    prisma.contract.findMany({ where: { customerId, status: { not: "CANCELLED" } }, select: { id: true } }),
    prisma.conversation.findMany({ where: { customerId }, select: { contractId: true } }),
  ]);
  const have = new Set(existing.map((c) => c.contractId ?? "general"));
  const missing = contracts.filter((c) => !have.has(c.id));
  if (missing.length) {
    await prisma.conversation.createMany({ data: missing.map((c) => ({ customerId, contractId: c.id })), skipDuplicates: true });
  }
  if (!have.has("general")) await prisma.conversation.create({ data: { customerId } });
}

type ConversationWith = Conversation & { contract: Contract | null; advisor: Pick<User, "name"> | null };

export async function findOwnConversation(customerId: string, id: string): Promise<ConversationWith | null> {
  return prisma.conversation.findFirst({
    where: { id, customerId },
    include: { contract: true, advisor: { select: { name: true } } },
  });
}

export function conversationTitle(conv: ConversationWith, locale: Locale): string {
  if (!conv.contract) return GENERAL_TITLE[locale];
  return `${describeService(conv.contract.category, locale).serviceName} · ${conv.contract.provider}`;
}

const firstName = (name: string | undefined | null) => (name ?? "").trim().split(/\s+/)[0] || null;

export function serializeMessage(m: Message & { sender: Pick<User, "id" | "name">; document: Pick<Document, "id" | "title"> | null }, customerId: string) {
  return {
    id: m.id,
    kind: m.kind === "SYSTEM" ? "system" : "text",
    fromMe: m.kind !== "SYSTEM" && m.senderId === customerId,
    senderName: m.senderId === customerId ? null : firstName(m.sender.name),
    text: m.content,
    at: m.createdAt,
    attachment: m.document ? { id: m.document.id, title: m.document.title } : null,
  };
}

export function serializeRequest(r: ServiceRequest, locale: Locale) {
  const step = requestStep(r.status);
  return {
    id: r.id,
    number: ticketNumber(r.id),
    topic: r.subjectType,
    title: r.subject,
    description: r.description,
    step,
    statusLabel: STATUS_WORDS[step][locale],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Requests that belong to a conversation: opened in it, or (older ones) about the same contract. */
export function requestsWhere(conv: Conversation) {
  return conv.contractId
    ? { customerId: conv.customerId, OR: [{ conversationId: conv.id }, { contractId: conv.contractId }] }
    : { customerId: conv.customerId, conversationId: conv.id };
}

export async function unreadCount(conv: Conversation): Promise<number> {
  return prisma.message.count({
    where: {
      conversationId: conv.id,
      senderId: { not: conv.customerId },
      ...(conv.customerLastReadAt ? { createdAt: { gt: conv.customerLastReadAt } } : {}),
    },
  });
}

/** Writes a message into a conversation and moves the conversation to the top of the lists. */
export async function addMessage(conv: Conversation, data: { senderId: string; content: string; kind?: "TEXT" | "SYSTEM"; documentId?: string | null; serviceRequestId?: string | null }) {
  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: data.senderId,
        content: data.content,
        kind: data.kind ?? "TEXT",
        documentId: data.documentId ?? null,
        serviceRequestId: data.serviceRequestId ?? null,
      },
      include: { sender: { select: { id: true, name: true } }, document: { select: { id: true, title: true } } },
    }),
    prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: now, ...(data.senderId === conv.customerId ? { customerLastReadAt: now } : {}) },
    }),
  ]);
  return message;
}
