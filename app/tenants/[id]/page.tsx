import { currentSuperAdmin } from "@/lib/super-admin";
import { TopNav } from "@/components/top-nav";
import { TenantDetailClient } from "./tenant-detail-client";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id, deletedAt: null },
    select: { name: true },
  });
  return { title: `${tenant?.name ?? id} — PeopleCore Admin` };
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await currentSuperAdmin();
  const { id } = await params;

  const row = await prisma.tenant.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!row) notFound();

  const adminMembership = row.memberships.find((m) => m.role === "ADMIN");
  const hrAdmins = row.memberships.filter((m) => m.role === "ADMIN").length;

  const tenant = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan as string,
    status: row.status as string,
    employeeCount: row.memberships.length,
    hrAdmins,
    createdAt: row.createdAt.toISOString(),
    adminEmail: adminMembership?.user.email ?? "",
  };

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
