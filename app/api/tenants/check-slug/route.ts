import { type NextRequest, NextResponse } from "next/server";
import { currentSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/db";

/**
 * GET /api/tenants/check-slug?slug=<value>
 *
 * Returns { available: boolean } — whether the given slug is free to use.
 * Used by the wizard's Step 1 for async uniqueness checking on blur.
 *
 * Auth: requires org:admin Clerk session (via currentSuperAdmin()).
 * Returns 400 if slug param is missing or empty.
 */
export async function GET(request: NextRequest) {
  await currentSuperAdmin();

  const slug = new URL(request.url).searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug param required" }, { status: 400 });
  }

  const existing = await prisma.tenant.findFirst({
    where: { slug },
    select: { id: true },
  });

  return NextResponse.json({ available: existing === null });
}
