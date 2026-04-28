import { currentSuperAdmin } from "@/lib/super-admin";

export const metadata = { title: "New tenant — PeopleCore Admin" };

export default async function NewTenantPage() {
  await currentSuperAdmin();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Create tenant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tenant creation form coming in PC-76.
        </p>
      </main>
    </div>
  );
}
