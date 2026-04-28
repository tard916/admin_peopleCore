import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Admin app proxy (replaces deprecated middleware convention — Next.js 16).
 *
 * Gate logic (in order):
 * 1. Public paths → pass through
 * 2. No token / invalid aud → redirect /login
 * 3. isSuperAdmin=false → redirect /login
 * 4. totpEnrolled=false → redirect /enroll-totp (unless already there)
 *
 * Mirrors peopleCore/proxy.ts but gates on isSuperAdmin + totpEnrolled
 * instead of tenantId.
 */

const PUBLIC_PATHS = [
  "/login",
  "/verify-mfa",
  "/api/auth",
];

const TOTP_ENROLLMENT_PATH = "/enroll-totp";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through public paths (and all sub-paths of /api/auth)
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Cookie name matches auth.ts config
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-adminjs.session-token"
      : "adminjs.session-token";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
    cookieName,
  });

  // No token or wrong audience → login
  if (!token || token.aud !== "admin" || !token.isSuperAdmin) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // TOTP not enrolled → force enrollment
  if (!token.totpEnrolled && pathname !== TOTP_ENROLLMENT_PATH) {
    return NextResponse.redirect(new URL(TOTP_ENROLLMENT_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
