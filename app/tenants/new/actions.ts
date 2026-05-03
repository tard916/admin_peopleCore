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

  // --- DB work inside try so unique-constraint errors are caught cleanly.
  // redirect() is intentionally OUTSIDE this block: in Next.js App Router,
  // redirect() throws a special NEXT_REDIRECT error internally. If it were
  // inside the catch, that error would be swallowed and the tenant would be
  // silently created without the user ever reaching /onboard/success.
  let tenantSlug: string;
  try {
    const tenant = await prisma.tenant.create({
      data: {
        id: `ten_${nanoid(8)}`,
        name,
        slug,
        plan,
        status: "ACTIVE",
        memberships: {
          create: [
            {
              role: "ADMIN",
              user: {
                create: {
                  id: `usr_${nanoid(8)}`,
                  email,
                  name: `${firstName} ${lastName}`,
                  hashedPassword,
                  mustChangePassword: true,
                },
              },
            },
          ],
        },
      },
    });

    // Store credentials in a short-lived (60s) iron-session flash cookie.
    const session = await getFlashSession();
    session.tempPassword = tempPassword;
    session.tenantSlug = tenant.slug;
    session.adminEmail = email;
    await session.save();

    tenantSlug = tenant.slug;
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

  // redirect() must be called outside try/catch — it throws NEXT_REDIRECT
  // which must propagate uncaught for the App Router to handle it correctly.
  void tenantSlug; // used above; redirect is unconditional
  redirect("/onboard/success");
}
