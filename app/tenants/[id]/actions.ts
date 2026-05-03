"use server";

/**
 * RULE: never call redirect() in server actions invoked from client components.
 *
 * redirect() throws NEXT_REDIRECT internally. When a client component calls a
 * server action inside try/catch (e.g. startTransition → try { await action() }),
 * the NEXT_REDIRECT is caught and the catch block runs instead of navigating.
 * The DB write succeeds but the UI shows an error — a silent data/UI split.
 *
 * Pattern for client-initiated mutations that need navigation:
 *   Server action  → does DB work, revalidatePath(), returns void
 *   Client handler → calls router.push() / router.replace() after await
 *
 * redirect() is safe when called from:
 *   - Server Component renders (pages, layouts)
 *   - Route Handlers
 *   - Server actions bound to <form action={...}> via useActionState
 *     (Next.js handles NEXT_REDIRECT before React's error boundary)
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Edit tenant (name + plan)
// ---------------------------------------------------------------------------
const editSchema = z.object({
  name: z.string().min(1, "Required"),
  plan: z.enum(["FREE", "STARTER", "GROWTH", "ENTERPRISE"]),
});

export type EditTenantState =
  | { errors?: Record<string, string>; error?: string }
  | undefined;

export async function editTenantAction(
  tenantId: string,
  _prev: EditTenantState,
  formData: FormData,
): Promise<EditTenantState> {
  const admin = await currentSuperAdmin();

  const parsed = editSchema.safeParse({
    name: formData.get("name"),
    plan: formData.get("plan"),
  });

  if (!parsed.success) {
    return {
      errors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [
          k,
          v?.[0] ?? "",
        ]),
      ),
    };
  }

  const { name, plan } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const before = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, plan: true },
    });

    await tx.tenant.update({
      where: { id: tenantId },
      data: { name, plan },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        entityType: "Tenant",
        entityId: tenantId,
        action: "admin.tenant.edit",
        before: { name: before.name, plan: before.plan },
        after: { name, plan },
      },
    });
  });

  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/tenants");
}

// ---------------------------------------------------------------------------
// Suspend / Reactivate
// ---------------------------------------------------------------------------
export async function suspendTenantAction(tenantId: string): Promise<void> {
  const admin = await currentSuperAdmin();

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { status: true },
    });

    if (tenant.status !== "ACTIVE") return; // idempotent

    await tx.tenant.update({
      where: { id: tenantId },
      data: { status: "SUSPENDED" },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        entityType: "Tenant",
        entityId: tenantId,
        action: "admin.tenant.suspend",
        before: { status: "ACTIVE" },
        after: { status: "SUSPENDED" },
      },
    });
  });

  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/tenants");
}

export async function reactivateTenantAction(tenantId: string): Promise<void> {
  const admin = await currentSuperAdmin();

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { status: true },
    });

    if (tenant.status !== "SUSPENDED") return; // idempotent

    await tx.tenant.update({
      where: { id: tenantId },
      data: { status: "ACTIVE" },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        entityType: "Tenant",
        entityId: tenantId,
        action: "admin.tenant.reactivate",
        before: { status: "SUSPENDED" },
        after: { status: "ACTIVE" },
      },
    });
  });

  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/tenants");
}

// ---------------------------------------------------------------------------
// Soft-delete
// ---------------------------------------------------------------------------
// Returns void (not never) — redirect() is NOT called here.
// Calling redirect() from a server action that's invoked via startTransition
// in a client component causes NEXT_REDIRECT to be caught by the client's
// try/catch, showing a spurious error even though the DB write succeeded.
// The client calls router.push("/tenants") after this action resolves instead.
export async function deleteTenantAction(tenantId: string): Promise<void> {
  const admin = await currentSuperAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        entityType: "Tenant",
        entityId: tenantId,
        action: "admin.tenant.delete",
        after: { deletedAt: new Date().toISOString() },
      },
    });
  });

  revalidatePath("/tenants");
  // Navigation back to /tenants is handled by the client after this resolves
}
