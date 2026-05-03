import { type NextRequest, NextResponse } from "next/server";
import { getFlashSession } from "@/lib/session";

/**
 * GET /api/flash
 *
 * Route Handler that reads the iron-session flash cookie, clears it, and
 * redirects to /onboard/success with the one-time data as search params.
 *
 * This exists because Next.js App Router forbids cookie writes inside a
 * Server Component render — they are only allowed in Server Actions and
 * Route Handlers. The /onboard/success page used to call session.save()
 * (which writes a cookie) during render, causing:
 *   "Error: Cookies can only be modified in a Server Action or Route Handler"
 *
 * Flow:
 *   createTenantAction → saves flash → redirect /api/flash
 *   /api/flash         → reads + clears flash → redirect /onboard/success?...
 *   /onboard/success   → reads plain search params, no cookie writes
 */
export async function GET(request: NextRequest) {
  const session = await getFlashSession();
  const { tempPassword, tenantSlug, adminEmail } = session;

  // Clear the flash — Route Handler, so cookie writes are allowed
  session.tempPassword = undefined;
  session.tenantSlug = undefined;
  session.adminEmail = undefined;
  await session.save();

  // Derive base URL from the incoming request so this works on any domain
  const base = new URL(request.url).origin;

  if (!tempPassword || !tenantSlug) {
    return NextResponse.redirect(new URL("/onboard/success", base));
  }

  const dest = new URL("/onboard/success", base);
  dest.searchParams.set("slug", tenantSlug);
  dest.searchParams.set("email", adminEmail ?? "");
  dest.searchParams.set("pass", tempPassword);

  return NextResponse.redirect(dest);
}
