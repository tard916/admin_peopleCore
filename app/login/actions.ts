"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { verifyAdminCredentials } from "@/lib/auth";
import { getIpLimiter, getAccountLimiter } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Login server action.
 *
 * Handles two paths:
 * 1. TOTP disabled → calls signIn() → NextAuth mints JWT
 * 2. TOTP enabled → creates PendingMfaChallenge (upsert) + sets mfa_nonce
 *    cookie → redirects to /verify-mfa
 *
 * TODO (PC-74): PendingMfaChallenge upsert requires PC-69 migration.
 * Until then, all users go through path 1.
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
    return { error: `Too many attempts. Try again in ${seconds} seconds.` };
  }

  // ── Credential validation ────────────────────────────────────────────────
  const user = await verifyAdminCredentials(email, password);
  if (!user) {
    return { error: "Invalid email or password." };
  }

  // ── TOTP branch (PC-74) ──────────────────────────────────────────────────
  if (user.totpEnabled) {
    // TODO (PC-74): implement after PC-69 migration adds PendingMfaChallenge
    // For now, fall through to signIn() — TOTP will be enforced once PC-69 runs.
    const crypto = await import("crypto");
    const nonce = crypto.randomBytes(32).toString("hex");
    void nonce; // suppress unused warning until PC-74

    // Upsert PendingMfaChallenge, set signed mfa_nonce cookie, redirect
    // This block requires: prisma.pendingMfaChallenge (PC-69 migration)
    void cookies; // will be used in PC-74
    redirect("/verify-mfa");
  }

  // ── Non-TOTP path ────────────────────────────────────────────────────────
  await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  redirect("/tenants");
}
