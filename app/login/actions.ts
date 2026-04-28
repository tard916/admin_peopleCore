"use server";

import { headers } from "next/headers";
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
 * 1. TOTP disabled → signIn(redirectTo) → NextAuth sets cookie + redirects
 * 2. TOTP enabled → /verify-mfa (PC-74)
 *
 * NOTE: signIn() with redirectTo throws a NEXT_REDIRECT internally — that
 * redirect is what actually sets the session cookie atomically. Calling
 * signIn(..., { redirect: false }) then redirect() separately leaves the
 * cookie unset because the middleware-level cookie setter only runs on the
 * NextAuth-internal redirect path.
 */
export async function loginAction(
  input: unknown,
): Promise<{ error: string } | undefined> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { email, password } = parsed.data;

  // ── Rate limiting (no-op when Upstash env is unset) ──────────────────────
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
  // PC-69 schema is in place; PC-74 will wire the actual challenge here.
  // For now, TOTP-enabled users still go through the regular signIn flow
  // (verify-mfa stub will be implemented in PC-74).

  // ── Sign in ──────────────────────────────────────────────────────────────
  // signIn() throws NEXT_REDIRECT on success — let it propagate so the
  // session cookie is set atomically. Catch only auth errors.
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/tenants",
    });
  } catch (err) {
    // NEXT_REDIRECT is the success path — re-throw so Next handles it.
    if (err && typeof err === "object" && "digest" in err) {
      const digest = String((err as { digest: unknown }).digest);
      if (digest.startsWith("NEXT_REDIRECT")) throw err;
    }
    return { error: "Sign-in failed. Please try again." };
  }
}
