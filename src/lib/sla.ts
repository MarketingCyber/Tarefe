/**
 * Phase 8.7 "Support Operations — Add SLA tracking". Definition kept
 * simple and honest: a ticket is "waiting on us" when its most recent
 * message came from the customer (or it has no messages yet at all) and
 * isn't COMPLETED — the clock is time since that last customer message
 * (or since the ticket was opened, if nobody's replied yet). A ticket
 * whose last message came from staff is "waiting on the customer", not a
 * breach candidate regardless of how old it is.
 */
export const TICKET_SLA_BREACH_HOURS = 24;

export interface SlaInfo {
  hoursWaiting: number;
  breached: boolean;
}

export function computeTicketSla(status: string, ticketCreatedAt: Date, lastMessage: { createdAt: Date; senderRole: string } | null): SlaInfo | null {
  if (status === "COMPLETED") return null;
  const waitingOnUs = !lastMessage || lastMessage.senderRole === "CUSTOMER";
  if (!waitingOnUs) return null;
  const since = lastMessage ? lastMessage.createdAt : ticketCreatedAt;
  const hoursWaiting = (Date.now() - since.getTime()) / 3_600_000;
  return { hoursWaiting, breached: hoursWaiting > TICKET_SLA_BREACH_HOURS };
}
