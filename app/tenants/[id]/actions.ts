"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
export async function deleteTenantAction(tenantId: string): Promise<never> {
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
  redirect("/tenants");
}
