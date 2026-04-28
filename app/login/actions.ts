"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { verifyAdminCredentials } from "@/lib/auth";
import { getIpLimiter, getAccountLimiter } from "@/lib/ratelimit";
import { prisma } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Login server action.
 *
 * Handles two paths:
 * 1. TOTP disabled → calls signIn() directly → NextAuth mints JWT
 * 2. TOTP enabled → creates PendingMfaChallenge (upsert) + sets mfa_nonce
 *    cookie → redirects to /verify-mfa
 *
 * Rate limiting applied before credential check (both IP and account axes).
 */
export async function loginAction(
  input: unknown,
): Promise<{ error: string } | undefined> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { email, password } = parsed.data;

  // ── Rate limiting ────────────────────────────────────────────────────────
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const [ipResult, acctResult] = await Promise.all([
    getIpLimiter().limit(`login:ip:${ip}`),
    getAccountLimiter().limit(`login:acct:${email}`),
  ]);

  if (!ipResult.success || !acctResult.success) {
    const reset = Math.max(ipResult.reset, acctResult.reset);
    const seconds = Math.ceil((reset - Date.now()) / 1000);
    return {
      error: `Too many attempts. Try again in ${seconds} seconds.`,
    };
  }

  // ── Credential validation ────────────────────────────────────────────────
  const user = await verifyAdminCredentials(email, password);
  if (!user) {
    // Same message for wrong password AND non-super-admin — no disclosure
    return { error: "Invalid email or password." };
  }

  // ── TOTP branch ──────────────────────────────────────────────────────────
  if (user.totpEnabled) {
    const crypto = await import("crypto");
    const nonce = crypto.randomBytes(32).toString("hex");

    // Upsert — handles concurrent browser tabs gracefully (most-recent wins)
    await prisma.pendingMfaChallenge.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        nonce,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      update: {
        nonce,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // Sign the nonce with AUTH_SECRET for the cookie
    const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET!);
    hmac.update(nonce);
    const signature = hmac.digest("hex");
    const signedNonce = `${nonce}.${signature}`;

    const cookieStore = await cookies();
    cookieStore.set("mfa_nonce", signedNonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 5 * 60, // 5 minutes
      path: "/",
    });

    redirect("/verify-mfa");
  }

  // ── Non-TOTP path: call signIn() ─────────────────────────────────────────
  await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  redirect("/tenants");
}
