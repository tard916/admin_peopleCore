import { currentSuperAdmin } from "@/lib/super-admin";

export const metadata = { title: "Tenant detail — PeopleCore Admin" };

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await currentSuperAdmin();
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Tenant detail
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Detail view for tenant <code>{id}</code> coming in PC-77.
        </p>
      </main>
    </div>
  );
}
