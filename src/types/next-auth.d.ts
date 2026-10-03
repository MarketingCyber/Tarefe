import type { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: UserRole;
    } & DefaultSession["user"];
  }
  // Lets auth.ts's signIn callback set `user.role` (mutating the object
  // that flows through to the jwt callback — see that file's own comment
  // on why this works without a database adapter) without a manual cast.
  interface User {
    role?: UserRole;
  }
}
