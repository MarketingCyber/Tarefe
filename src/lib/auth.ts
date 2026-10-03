import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { decryptSecret, verifyTotpCode } from "./mfa";
import { rateLimit, getClientIp } from "./rate-limit";

/**
 * Single source of truth for whether Google sign-in is actually usable —
 * both this file (whether to register the provider at all) and any page
 * that renders a "Continue with Google" button (login/register) read this,
 * so a fresh deployment with no Google Cloud credentials configured yet
 * shows no dead button instead of one that's guaranteed to error. Google
 * OAuth also flatly cannot work without HTTPS on a real domain (Google
 * rejects raw-IP and non-HTTPS redirect URIs outright) — see the
 * 2026-08-31 architecture memory entry for the verified policy detail;
 * this flag alone doesn't guarantee the feature works end-to-end, only
 * that the two required env vars are present.
 */
export function isGoogleAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Custom credential errors for the 2-step MFA flow. NextAuth v5 surfaces a
 * thrown CredentialsSignin's `.code` to the client via signIn(..., {redirect:
 * false})'s returned `code` field — verified directly against the installed
 * @auth/core source (not just its docs): index.js's catch block does
 * `if (error instanceof CredentialsSignin) params.set("code", error.code)`,
 * and next-auth/react.js's signIn() reads that same `code` query param back
 * out. CredentialsSignin's own constructor unconditionally sets
 * `this.code = "credentials"` in its body — a class field initializer on a
 * subclass runs *after* the parent constructor body finishes, so overriding
 * `code` as a field here (not passing it as a constructor argument, which
 * the base class ignores) is what actually sticks.
 */
class MfaRequiredError extends CredentialsSignin {
  code = "mfa_required";
}
class MfaInvalidError extends CredentialsSignin {
  code = "mfa_invalid";
}
class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}
/** Account exists but was created via Google (passwordHash is null) — there's no password to check against at all, so this is a distinct, clearer error than a generic "wrong email or password". */
class GoogleOnlyAccountError extends CredentialsSignin {
  code = "google_only";
}
/** Access revoked via /ops/team (see prisma/schema.prisma's User.active comment) — a real, distinct reason to reject, not a wrong-password lookalike. */
class AccountDeactivatedError extends CredentialsSignin {
  code = "deactivated";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "TOTP", type: "text" },
      },
      async authorize(credentials, request) {
        // Login had no brute-force protection at all — /api/leads and
        // /api/events do (see src/lib/rate-limit.ts), this is at least as
        // sensitive as either. IP-only, matching this codebase's one
        // existing rate-limiting convention — not per-account lockout,
        // which would need its own schema field and is a real, separate
        // follow-up if this ever isn't enough.
        //
        // 60/minute — raised twice from an initial 10, then 30, both of
        // which a real full parallel run of this project's E2E suite
        // (~18+ `login()` calls across specs, several doing more than one
        // — mfa.spec.ts's full round trip, document-upload.spec.ts's
        // three-way staff/customer/staff re-logins) tripped for real, not
        // hypothetically — see e2e/README.md for the actual numbers this
        // was tuned against. Still a real, meaningful control: a genuine
        // credential-stuffing tool wants sustained rates far above 1/sec
        // to be worth running at all, and going from "no limit" to *any*
        // limit is what closes the actual gap here — the precise number
        // matters far less than that. IP-only, matching this codebase's
        // one existing rate-limiting convention — not per-account
        // lockout, which would need its own schema field and is a real,
        // separate follow-up if this ever isn't enough.
        const { allowed } = rateLimit(`login:${getClientIp(request)}`, 60);
        if (!allowed) throw new RateLimitedError();

        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const totpCode = credentials?.totpCode as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        if (!user.active) throw new AccountDeactivatedError();

        // Google-only account (see prisma/schema.prisma's passwordHash
        // comment) — nothing to compare a submitted password against.
        if (!user.passwordHash) throw new GoogleOnlyAccountError();

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // MFA is staff-only (ADVISOR/ADMIN) — see prisma/schema.prisma's
        // User.mfaEnabled comment. Password already verified above at this
        // point, so a wrong/missing TOTP code is the only remaining gate.
        if (user.mfaEnabled && user.mfaSecret) {
          if (!totpCode) throw new MfaRequiredError();
          const secret = decryptSecret(user.mfaSecret);
          if (!(await verifyTotpCode(secret, totpCode))) throw new MfaInvalidError();
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    // Registered conditionally — see isGoogleAuthEnabled()'s own comment.
    // An empty array here (no credentials configured yet) is deliberate,
    // not a bug: the provider array must never contain a Google() call
    // built from undefined clientId/clientSecret, which is a worse
    // failure mode (broken for every visitor) than simply not offering
    // the button yet.
    ...(isGoogleAuthEnabled() ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })] : []),
  ],
  callbacks: {
    /**
     * Only meaningful for the Google provider — Credentials already does
     * all its own verification inside authorize() above and always
     * returns true here. This project has no NextAuth database adapter
     * (no Account/Session/VerificationToken tables — deliberately, to
     * stay minimal), which means Auth.js itself does *nothing* to find,
     * link, or create users for an OAuth sign-in (verified directly
     * against the installed @auth/core source: handleLoginOrRegister()
     * returns the raw, unpersisted OAuth profile as-is when `!adapter`).
     * So all of that is this callback's job, by hand:
     *  - Deliberately customer-only (2026-08-31 decision): staff
     *    (ADVISOR/ADMIN) keep password+MFA as their only path. An
     *    existing staff email attempting Google sign-in is rejected
     *    outright, not silently downgraded or linked — MFA stays a real
     *    gate, not something a Google-linked inbox can bypass.
     *  - An existing CUSTOMER account with the same (Google-verified)
     *    email is linked automatically. Safe to auto-link without an
     *    extra confirmation step specifically because Google verifies
     *    email ownership — unlike a self-reported email, this isn't
     *    trusting the client.
     *  - No existing account at all creates one, `role: "CUSTOMER"`,
     *    `passwordHash: null` — this is the actual "auto signup" half of
     *    the feature; there is no separate registration form.
     * Mutating `user.id`/`user.role` here (rather than returning a new
     * object) is what makes the real Prisma id/role reach the `jwt`
     * callback below — confirmed against @auth/core's source: the object
     * this callback receives as `user` is the exact same reference later
     * passed into handleLoginOrRegister() as the OAuth profile, and
     * (again, no adapter) that function returns it unmutated, so
     * `sub`/`user.id` in the token comes from these mutations.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const email = profile?.email;
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.role !== "CUSTOMER") return false;
        if (!existing.active) return false;
        user.id = existing.id;
        user.role = existing.role;
        return true;
      }

      const created = await prisma.user.create({
        data: { email, name: profile?.name ?? email, passwordHash: null, role: "CUSTOMER" },
      });
      user.id = created.id;
      user.role = created.role;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.sub;
      }
      return session;
    },
  },
});
