import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 dropped the built-in Rust query engine in favor of driver
// adapters — PrismaClient no longer reads DATABASE_URL on its own, it
// needs an explicit adapter instance. See prisma.config.ts for the
// CLI/migration-side connection.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Standard Next.js dev-mode singleton pattern — without this, hot-reload
// creates a new PrismaClient (and a new DB connection pool) on every file
// change, quickly exhausting Postgres's connection limit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
