/**
 * Outgoing email (2026-10-23, first user: the mobile app's sign-in code).
 *
 * The owner uses an email API for the app, but which provider and its credentials are not set up in this
 * project yet. Until EMAIL_PROVIDER is configured:
 *  - in development the message is printed to the server console (so sign-in can be tested locally), and
 *  - in production sending fails loudly instead of pretending it worked.
 * Adding the real provider means adding one branch below; callers don't change.
 */

export type OutgoingEmail = { to: string; subject: string; text: string };

export class EmailNotConfiguredError extends Error {}

export async function sendEmail(message: OutgoingEmail): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";

  if (provider === "console") {
    if (process.env.NODE_ENV === "production") throw new EmailNotConfiguredError("EMAIL_PROVIDER is not configured");
    console.info(`[email:dev] to=${message.to} subject=${message.subject}\n${message.text}`);
    return;
  }

  throw new EmailNotConfiguredError(`Unknown EMAIL_PROVIDER: ${provider}`);
}
