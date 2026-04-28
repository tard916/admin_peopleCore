"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { currentSuperAdmin } from "@/lib/super-admin";
import { getFlashSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const schema = z.object({
  name: z.string().min(1, "Required"),
  slug: z
    .string()
    .min(1, "Required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  plan: z.enum(["FREE", "STARTER", "GROWTH", "ENTERPRISE"]),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
});

export type CreateTenantInput = z.infer<typeof schema>;
export type CreateTenantState = { errors?: Record<string, string>; error?: string } | undefined;

export async function createTenantAction(
  _prev: CreateTenantState,
  formData: FormData,
): Promise<CreateTenantState> {
  await currentSuperAdmin();

  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    plan: formData.get("plan"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const { name, slug, plan, firstName, lastName, email } = parsed.data;

  // Generate temp password
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const tempPassword = `Tmp-${rand}!`;
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  try {
    // TODO (PC-76): Requires PC-68 migration to add Tenant model + User.isSuperAdmin/tenantId fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant = await (prisma as any).tenant.create({
      data: {
        id: `ten_${nanoid(8)}`,
        name,
        slug,
        plan,
        status: "ACTIVE",
        users: {
          create: {
            id: `usr_${nanoid(8)}`,
            firstName,
            lastName,
            email,
            hashedPassword,
            mustChangePassword: true,
          },
        },
      },
    });

    const session = await getFlashSession();
    session.tempPassword = tempPassword;
    session.tenantSlug = tenant.slug;
    session.adminEmail = email;
    await session.save();

    redirect(`/onboard/success`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { errors: { slug: "This slug is already taken" } };
    }
    if (msg.includes("Unique constraint") && msg.includes("email")) {
      return { errors: { email: "This email is already registered" } };
    }
    return { error: "Failed to create tenant. Please try again." };
  }
}
