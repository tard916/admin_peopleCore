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
 * - Gates on isSuperAdmin === true (added by PC-68 migration)
 * - Uses distinct cookie name "adminjs.session-token" to prevent browser-level
 *   confusion with peopleCore's "authjs.session-token"
 * - JWT includes aud: "admin" — cross-app token isolation
 * - TOTP flow: MFA challenge is NOT created in authorize() — NextAuth v5
 *   beta.31 cannot attach custom payload to a null return. The login server
 *   action in app/login/actions.ts handles TOTP branching after calling
 *   verifyAdminCredentials().
 *
 * NOTE: isSuperAdmin / totpEnabled fields require PC-68 migration to exist.
 * Until that migration runs, type-cast via `as any` keeps the scaffold
 * compiling. Remove the casts after running the migration.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = any;

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
       * authorize() only handles the non-TOTP path.
       * When TOTP is enabled, the login action bypasses signIn() entirely.
       * TODO: Remove AnyUser cast after PC-68 migration adds isSuperAdmin/totpEnabled.
       */
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const user: AnyUser = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            hashedPassword: true,
            // TODO: add isSuperAdmin, totpEnabled after PC-68 migration
          },
        });

        if (!user?.hashedPassword) return null;
        // TODO: guard `!user.isSuperAdmin` after PC-68 migration
        if (user.isSuperAdmin === false) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.hashedPassword,
        );
        if (!valid) return null;

        if (user.totpEnabled) return null; // TOTP path handled by login action

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          isSuperAdmin: true,
          totpEnrolled: user.totpEnabled ?? false,
          sessionVersion: user.sessionVersion ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.isSuperAdmin = (user as AnyUser).isSuperAdmin;
        token.totpEnrolled = (user as AnyUser).totpEnrolled;
        token.sessionVersion = (user as AnyUser).sessionVersion;
        token.aud = "admin";
        return token;
      }

      if (token.aud !== "admin") return {};

      if (token.sub) {
        const dbUser: AnyUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            sessionVersion: true,
            // TODO: add isSuperAdmin after PC-68 migration
          },
        });
        if (!dbUser || dbUser.sessionVersion !== token.sessionVersion) {
          return {};
        }
        // TODO: also check isSuperAdmin after PC-68 migration
      }

      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!token.sub || token.aud !== "admin") return { ...session, user: undefined } as any;
      session.user.id = token.sub;
      (session.user as AnyUser).isSuperAdmin = token.isSuperAdmin;
      (session.user as AnyUser).totpEnrolled = token.totpEnrolled;
      return session;
    },
  },
});

/**
 * Validate admin credentials without going through NextAuth's signIn().
 * Used by the login server action for the TOTP branching path.
 *
 * TODO: Tighten types after PC-68 migration adds isSuperAdmin/totpEnabled/totpSecret.
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
  const user: AnyUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      hashedPassword: true,
      sessionVersion: true,
      // TODO: add isSuperAdmin, totpEnabled, totpSecret after PC-68 migration
    },
  });

  if (!user?.hashedPassword) return null;
  // TODO: guard `!user.isSuperAdmin` after PC-68 migration

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    totpEnabled: user.totpEnabled ?? false,
    totpSecret: user.totpSecret ?? null,
    sessionVersion: user.sessionVersion ?? 0,
  };
}
