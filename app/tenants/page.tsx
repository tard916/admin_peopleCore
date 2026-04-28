import { currentSuperAdmin } from "@/lib/super-admin";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { TopNav } from "@/components/top-nav";
import { TenantList } from "./tenant-list";
import { prisma } from "@/lib/db";

export const metadata = { title: "Tenants — PeopleCore Admin" };

export default async function TenantsPage() {
  await currentSuperAdmin();

  // TODO (PC-75): replace with real DB query after PC-68 migration adds Tenant model
  // For now render the placeholder until the Tenant model + fields exist
  let tenants: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    employeeCount: number;
    createdAt: string;
  }[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).tenant.findMany({
      select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    tenants = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      plan: r.plan ?? "FREE",
      status: r.status ?? "ACTIVE",
      employeeCount: 0,
      createdAt: r.createdAt?.toISOString?.() ?? "",
    }));
  } catch {
    // Tenant model not yet migrated — show empty list with placeholder
  }

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
