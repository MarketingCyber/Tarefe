import nodemailer from "nodemailer";

/**
 * Outgoing email (2026-10-23, first user: the mobile app's sign-in code).
 *
 * EMAIL_PROVIDER picks how mail leaves:
 *  - "console" (default): in development the message is printed to the server console (so sign-in can be tested
 *    locally); in production sending fails loudly instead of pretending it worked.
 *  - "smtp" (2026-10-29, owner's choice: Zoho): SMTP_HOST, SMTP_PORT (465 = TLS), SMTP_USER, SMTP_PASS, and
 *    EMAIL_FROM (the sender shown to the customer, e.g. "Tarefe <noreply@tarefe.de>"; Zoho only accepts its own
 *    mailbox or a verified alias). For Zoho Mail EU: smtp.zoho.eu, 465, the mailbox address and an app password.
 * Adding another provider means adding one branch below; callers don't change.
 */

export type OutgoingEmail = { to: string; subject: string; text: string };

export class EmailNotConfiguredError extends Error {}

let transport: nodemailer.Transporter | null = null;

function smtpTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new EmailNotConfiguredError("SMTP_HOST / SMTP_USER / SMTP_PASS missing");
  const port = Number(process.env.SMTP_PORT ?? 465);
  transport ??= nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  return transport;
}

export async function sendEmail(message: OutgoingEmail): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";

  if (provider === "console") {
    if (process.env.NODE_ENV === "production") throw new EmailNotConfiguredError("EMAIL_PROVIDER is not configured");
    console.info(`[email:dev] to=${message.to} subject=${message.subject}\n${message.text}`);
    return;
  }

  if (provider === "smtp") {
    const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER;
    await smtpTransport().sendMail({ from, to: message.to, subject: message.subject, text: message.text });
    return;
  }

  throw new EmailNotConfiguredError(`Unknown EMAIL_PROVIDER: ${provider}`);
}
