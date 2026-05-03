import { type NextRequest, NextResponse } from "next/server";
import { currentSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/db";

/**
 * GET /api/tenants/check-email?email=<value>
 *
 * Returns { available: boolean } — whether the given email is not yet
 * registered to any user. Used by the wizard's Step 3 for async
 * uniqueness checking on blur.
 *
 * Comparison is case-insensitive.
 * Auth: requires org:admin Clerk session (via currentSuperAdmin()).
 * Returns 400 if email param is missing or empty.
 */
export async function GET(request: NextRequest) {
  await currentSuperAdmin();

  const email = new URL(request.url).searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email param required" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });

  return NextResponse.json({ available: existing === null });
}
