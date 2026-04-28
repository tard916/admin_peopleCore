import { currentSuperAdmin } from "@/lib/super-admin";
import { TopNav } from "@/components/top-nav";
import { TenantDetailClient } from "./tenant-detail-client";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Tenant ${id} — PeopleCore Admin` };
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await currentSuperAdmin();
  const { id } = await params;

  // TODO (PC-77): real query after PC-68 migration
  let tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    employeeCount: number;
    hrAdmins: number;
    createdAt: string;
    adminEmail: string;
  } | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).tenant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true },
    });
    if (row) {
      tenant = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        plan: row.plan ?? "FREE",
        status: row.status ?? "ACTIVE",
        employeeCount: 0,
        hrAdmins: 0,
        createdAt: row.createdAt?.toISOString?.() ?? "",
        adminEmail: "",
      };
    }
  } catch {
    // Tenant model not yet migrated
    notFound();
  }

  if (!tenant) notFound();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav
        crumbs={[
          { label: "Tenants", href: "/tenants" },
          { label: tenant.name },
        ]}
      />
      <TenantDetailClient tenant={tenant} />
    </div>
  );
}
