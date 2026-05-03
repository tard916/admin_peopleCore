"use server";

import { redirect } from "next/navigation";
import { currentSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/db";

/**
 * Mint an ImpersonationToken for the tenant's first ADMIN user,
 * then redirect to the handoff page.
 *
 * Security model (per plan Unit 11 / PC-78):
 * - Token is single-use (usedAt enforced atomically in peopleCore)
 * - Expires in 15 minutes (consume window only)
 * - Impersonation session TTL: 2 hours (set by peopleCore /api/impersonate)
 * - Pre-flight blocks if target admin has mustChangePassword=true
 */
export async function mintImpersonationTokenAction(tenantId: string): Promise<never> {
  const admin = await currentSuperAdmin();

  // Find the first ADMIN membership for this tenant (ordered by createdAt)
  const membership = await prisma.tenantMembership.findFirst({
    where: { tenantId, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: {
      userId: true,
      user: {
        select: { id: true, mustChangePassword: true, email: true },
      },
    },
  });

  if (!membership) {
    throw new Error("No admin user found for this tenant");
  }

  if (membership.user.mustChangePassword) {
    throw new Error(
      "Admin user must change their password before impersonation is possible",
    );
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  const token = await prisma.impersonationToken.create({
    data: {
      tenantId,
      targetUserId: membership.user.id,
      createdById: admin.id,
      expiresAt,
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: admin.id,
      entityType: "ImpersonationToken",
      entityId: token.id,
      action: "admin.impersonation.mint",
      after: {
        targetUserId: membership.user.id,
        targetEmail: membership.user.email,
        expiresAt: expiresAt.toISOString(),
      },
    },
  });

  redirect(`/impersonate/token/${token.id}`);
}
