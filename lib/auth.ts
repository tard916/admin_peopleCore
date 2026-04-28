import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

/**
 * Admin app NextAuth config.
 *
 * Key differences from peopleCore:
 * - No tenantSlug in credentials — super-admins are global, not tenant-scoped
 * - Gates on isSuperAdmin === true; non-super-admin attempts get same
 *   "Invalid credentials" message (no disclosure of account existence)
 * - Uses distinct cookie name "adminjs.session-token" to prevent browser-level
 *   confusion with peopleCore's "authjs.session-token"
 * - JWT includes aud: "admin" — cross-app token isolation (peopleCore uses
 *   aud: "peoplecore"). Each app's jwt() callback rejects mismatched aud.
 * - TOTP flow: MFA challenge is NOT created in authorize() — NextAuth v5
 *   beta.31 cannot attach custom payload to a null return. Instead, the
 *   login server action in app/login/actions.ts handles TOTP branching
 *   directly after calling verifyAdminCredentials().
 *
 * Session tombstone check mirrors peopleCore's sessionVersion pattern.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // No PrismaAdapter — JWT strategy only, no DB sessions
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-adminjs.session-token"
          : "adminjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      /**
       * authorize() only handles the non-TOTP path.
       * When TOTP is enabled, the login action bypasses signIn() entirely
       * and creates the PendingMfaChallenge + cookie directly.
       */
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            hashedPassword: true,
            isSuperAdmin: true,
            totpEnabled: true,
            sessionVersion: true,
          },
        });

        if (!user?.hashedPassword || !user.isSuperAdmin) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.hashedPassword,
        );
        if (!valid) return null;

        // TOTP path: return a signal so the login action can redirect to /verify-mfa.
        // We do NOT call signIn() — the action handles the MFA challenge creation.
        // Return null here so NextAuth doesn't mint a full session.
        // The action detects TOTP requirement via verifyAdminCredentials() helper.
        if (user.totpEnabled) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          isSuperAdmin: true,
          totpEnrolled: user.totpEnabled,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // ── Initial sign-in ──────────────────────────────────────────────────
      if (user) {
        token.isSuperAdmin = (user as { isSuperAdmin: boolean }).isSuperAdmin;
        token.totpEnrolled = (user as { totpEnrolled: boolean }).totpEnrolled;
        token.sessionVersion = (
          user as { sessionVersion: number }
        ).sessionVersion;
        token.aud = "admin";
        return token;
      }

      // ── Subsequent requests — token validation ───────────────────────────
      // Reject tokens from other apps
      if (token.aud !== "admin") return {};

      // Tombstone check (mirrors peopleCore sessionVersion pattern)
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            sessionVersion: true,
            isSuperAdmin: true,
          },
        });
        if (
          !dbUser ||
          dbUser.sessionVersion !== token.sessionVersion ||
          !dbUser.isSuperAdmin
        ) {
          return {}; // invalidate
        }
      }

      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!token.sub || token.aud !== "admin") return { ...session, user: undefined } as any;
      session.user.id = token.sub;
      (session.user as { isSuperAdmin?: boolean }).isSuperAdmin =
        token.isSuperAdmin as boolean;
      (session.user as { totpEnrolled?: boolean }).totpEnrolled =
        token.totpEnrolled as boolean;
      return session;
    },
  },
});

/**
 * Validate admin credentials without going through NextAuth's signIn().
 * Used by the login server action to handle the TOTP branching explicitly.
 *
 * Returns the user if credentials are valid, null otherwise.
 * Caller is responsible for rate limiting before calling this.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<{
  id: string;
  email: string;
  name: string | null;
  totpEnabled: boolean;
  totpSecret: string | null;
  sessionVersion: number;
} | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      hashedPassword: true,
      isSuperAdmin: true,
      totpEnabled: true,
      totpSecret: true,
      sessionVersion: true,
    },
  });

  if (!user?.hashedPassword || !user.isSuperAdmin) return null;

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    totpEnabled: user.totpEnabled,
    totpSecret: user.totpSecret,
    sessionVersion: user.sessionVersion,
  };
}
