"use server";

/**
 * No redirect() here — the wizard client calls router.push('/api/flash')
 * after receiving { ok: true }. redirect() must never be called from a server
 * action that is invoked via `await action(...)` in client event handlers —
 * NEXT_REDIRECT would be caught by the surrounding try/catch and swallowed.
 *
 * The action retains "use server" — the restriction is only on calling
 * redirect() inside it; client navigation is the caller's responsibility.
 */

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

// Kept for backward compatibility with create-tenant-form.tsx (deleted in Unit 5)
export type CreateTenantState = { errors?: Record<string, string>; error?: string } | undefined;

export type CreateTenantResult =
  | { ok: true }
  | { errors: Record<string, string> }
  | { error: string };

export async function createTenantAction(
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  await currentSuperAdmin();

  const parsed = schema.safeParse(input);
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

  // DB work inside try so unique-constraint errors are caught cleanly.
  // On success, return { ok: true } — the client calls router.push('/api/flash').
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
    // The /api/flash Route Handler reads + clears this and redirects to
    // /onboard/success — cookie writes are forbidden in Server Component renders.
    const session = await getFlashSession();
    session.tempPassword = tempPassword;
    session.tenantSlug = tenant.slug;
    session.adminEmail = email;
    await session.save();

    return { ok: true };
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
