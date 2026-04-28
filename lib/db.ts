import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Raw Prisma client — use for schema-level operations where you need
 * full control (e.g. explicit deletedAt checks, escape hatches).
 *
 * NOTE: This repo NEVER runs `prisma migrate`. Schema is owned by
 * the peopleCore repo. Run `npm run db:generate` after schema updates.
 */
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Extended client with soft-delete filter scoped to Tenant model only.
 * Use `db` for all tenant queries in the admin app — soft-deleted tenants
 * are excluded automatically.
 *
 * Escape hatch for querying deleted tenants:
 *   prisma.tenant.findMany({ where: { deletedAt: { not: null } } })
 *
 * WARNING: Relation traversals from non-Tenant models (e.g.
 * impersonationToken.include({ tenant: true })) do NOT inherit this filter.
 * Always guard with an explicit deletedAt: null check when going through
 * a relation that touches Tenant.
 *
 * TODO: Add prisma-extension-soft-delete once schema migrations (PC-68/69)
 * are applied and the deletedAt column exists. For now, db === prisma.
 */
export const db = prisma;
