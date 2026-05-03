import { currentSuperAdmin } from "@/lib/super-admin";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { TopNav } from "@/components/top-nav";
import { TenantList } from "./tenant-list";
import { prisma } from "@/lib/db";

export const metadata = { title: "Tenants — PeopleCore Admin" };

export default async function TenantsPage() {
  await currentSuperAdmin();

  const rows = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      createdAt: true,
      _count: { select: { memberships: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tenants = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    plan: r.plan as string,
    status: r.status as string,
    employeeCount: r._count.memberships,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav
        crumbs={[{ label: "Tenants" }]}
        actions={
          <Link href="/tenants/new" className={buttonVariants({ size: "sm" })}>
            + New tenant
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-5 flex-1">
        {tenants.length === 0 ? (
          <div>
            <div className="flex items-baseline gap-2.5 mb-4">
              <h1 className="text-[18px] font-bold text-foreground tracking-[-0.03em]">Tenants</h1>
              <span className="text-[12px] text-muted-foreground">0 results</span>
            </div>
            <div className="bg-surface rounded-xl border border-border py-16 text-center text-[13px] text-muted-foreground">
              No tenants yet — <Link href="/tenants/new" className="text-primary underline">create your first tenant</Link>.
            </div>
          </div>
        ) : (
          <TenantList tenants={tenants} />
        )}
      </main>
    </div>
  );
}
