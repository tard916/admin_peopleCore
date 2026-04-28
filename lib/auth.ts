import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

/**
 * Admin app NextAuth config.
 *
 * - No tenantSlug in credentials — super-admins are global, not tenant-scoped
 * - Gates on isSuperAdmin === true (PC-68 migration)
 * - Distinct cookie "adminjs.session-token" — no collision with peopleCore
 * - JWT aud: "admin" — cross-app token isolation
 * - TOTP flow: MFA challenge handled in login server action (app/login/actions.ts),
 *   NOT in authorize(). NextAuth v5 beta.31 cannot carry a custom payload on null return.
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
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
       * authorize() handles only the non-TOTP path.
       * When TOTP is enabled the login action redirects to /verify-mfa before
       * calling signIn(), so this function never runs for TOTP users.
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

        if (!user?.hashedPassword) return null;
        if (!user.isSuperAdmin) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.hashedPassword,
        );
        if (!valid) return null;

        // TOTP path: the login action already redirected to /verify-mfa.
        // If we somehow end up here with TOTP enabled, block sign-in.
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
      if (user) {
        // Initial sign-in — stamp the token with admin claims
        const u = user as {
          isSuperAdmin: boolean;
          totpEnrolled: boolean;
          sessionVersion: number;
        };
        token.isSuperAdmin = u.isSuperAdmin;
        token.totpEnrolled = u.totpEnrolled;
        token.sessionVersion = u.sessionVersion;
        token.aud = "admin";
        return token;
      }

      // Subsequent requests — validate aud and sessionVersion tombstone
      if (token.aud !== "admin") return {};

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { sessionVersion: true, isSuperAdmin: true },
        });
        if (
          !dbUser ||
          !dbUser.isSuperAdmin ||
          dbUser.sessionVersion !== token.sessionVersion
        ) {
          return {};
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (!token.sub || token.aud !== "admin") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { ...session, user: undefined } as any;
      }
      session.user.id = token.sub;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).isSuperAdmin = token.isSuperAdmin;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).totpEnrolled = token.totpEnrolled;
      return session;
    },
  },
});

/**
 * Validate admin credentials without going through NextAuth's signIn().
 * Used by the login server action for the TOTP branching path.
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

  if (!user?.hashedPassword) return null;
  if (!user.isSuperAdmin) return null;

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
