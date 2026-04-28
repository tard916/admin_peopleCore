import { currentSuperAdmin } from "@/lib/super-admin";
import { TopNav } from "@/components/top-nav";
import { CreateTenantForm } from "./create-tenant-form";

export const metadata = { title: "New tenant — PeopleCore Admin" };

export default async function NewTenantPage() {
  await currentSuperAdmin();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav
        crumbs={[
          { label: "Tenants", href: "/tenants" },
          { label: "New tenant" },
        ]}
      />
      <main className="mx-auto w-full max-w-[560px] px-6 py-7">
        <a
          href="/tenants"
          className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground mb-5 hover:text-foreground transition-colors"
        >
          ← Tenants
        </a>
        <h1 className="text-[20px] font-bold text-foreground tracking-[-0.03em] mb-6">
          New tenant
        </h1>
        <CreateTenantForm />
      </main>
    </div>
  );
}
