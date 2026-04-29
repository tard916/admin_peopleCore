import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Admin app proxy (Next.js 16 convention; replaces deprecated `middleware`).
 *
 * Gate logic (in order):
 * 1. Public paths (login, sign-in/up, api/webhooks) → pass through
 * 2. No Clerk session → redirect /login
 * 3. Clerk session present but no `org:admin` role → redirect /access-denied
 * 4. Otherwise → pass through (deeper authz happens in `currentSuperAdmin()`)
 *
 * The `User.isSuperAdmin` DB column is no longer the gate — Clerk's org role is.
 * See plan: docs/plans/2026-04-29-001-refactor-clerk-auth-migration-plan.md (Unit 3)
 */

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/access-denied(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  const { userId, has } = await auth();

  if (!userId) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (!has({ role: "org:admin" })) {
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
