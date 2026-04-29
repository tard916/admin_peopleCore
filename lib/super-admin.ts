import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export interface SuperAdminSession {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * Server-side helper that asserts the current request is from a verified
 * super-admin (Clerk org:admin + matching User row in DB).
 *
 * Bridges Clerk identity to the existing User table via `clerkId` (fast path)
 * with a one-time email-based lazy-link on first sign-in.
 *
 * Security guards (PC-79):
 * - Verified primary email required
 * - Case-insensitive email match
 * - Identity-conflict refusal (won't overwrite an existing clerkId)
 * - AuditLog for every link + every conflict attempt
 *
 * Redirects on any failure rather than throwing.
 */
export async function currentSuperAdmin(): Promise<SuperAdminSession> {
  const { userId, has } = await auth();

  if (!userId) redirect("/login");
  if (!has({ role: "org:admin" })) redirect("/access-denied");

  // Fast path: clerkId already linked
  const byClerkId = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, email: true, name: true },
  });
  if (byClerkId) return byClerkId;

  // Lazy-link path
  const clerk = await currentUser();
  const primary = clerk?.primaryEmailAddress;
  if (!primary || primary.verification?.status !== "verified") {
    redirect("/access-denied?reason=email_unverified");
  }

  const email = primary.emailAddress;
  const byEmail = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, name: true, clerkId: true },
  });

  if (!byEmail) redirect("/access-denied?reason=not_provisioned");

  // Identity-conflict guard (org-transfer attack defense)
  if (byEmail.clerkId !== null && byEmail.clerkId !== userId) {
    await prisma.auditLog.create({
      data: {
        tenantId: null,
        actorId: byEmail.id,
        entityType: "User",
        entityId: byEmail.id,
        action: "admin.clerk_link_conflict",
        before: { clerkId: byEmail.clerkId },
        after: { attemptedClerkId: userId },
      },
    });
    redirect("/access-denied?reason=identity_conflict");
  }

  // Atomic link with race tolerance
  try {
    await prisma.user.update({
      where: { id: byEmail.id },
      data: { clerkId: userId },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: null,
        actorId: byEmail.id,
        entityType: "User",
        entityId: byEmail.id,
        action: "admin.clerk_link",
        after: { clerkId: userId },
      },
    });
  } catch (err) {
    // Concurrent first-login race: another request linked first. Re-read.
    const winner = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, email: true, name: true },
    });
    if (winner) return winner;
    throw err;
  }

  return { id: byEmail.id, email: byEmail.email, name: byEmail.name };
}
