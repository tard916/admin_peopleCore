import { currentSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { mintImpersonationTokenAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impersonating… — PeopleCore Admin" };

/**
 * Tenant impersonation entry point.
 *
 * Server component that immediately mints an ImpersonationToken for the
 * tenant's first ADMIN user, then redirects to the POST handoff page.
 *
 * By handling this as a server component (not a client-side button click),
 * the token is minted server-side and the token ID only ever appears in the
 * next URL — never in a form field, never in a Referer header from the
 * admin dashboard.
 */
export default async function ImpersonateTenantPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  await currentSuperAdmin();
  const { tenantId } = await params;

  // Verify tenant exists and is active before minting
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId, deletedAt: null, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  if (!tenant) notFound();

  // Mint token and redirect to handoff — this throws a NEXT_REDIRECT internally
  await mintImpersonationTokenAction(tenantId);

  // Unreachable — mintImpersonationTokenAction always redirects or throws
  return null;
}
