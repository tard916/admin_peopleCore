import { currentSuperAdmin } from "@/lib/super-admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Tenants — PeopleCore Admin" };

export default async function TenantsPage() {
  // Auth gate
  await currentSuperAdmin();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="eyebrow">PeopleCore Admin</p>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Tenants
            </h1>
          </div>
          <Button asChild>
            <Link href="/tenants/new">New tenant</Link>
          </Button>
        </div>
      </header>

      {/* Content — implemented in PC-75 */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-xl border border-border bg-surface py-16 text-center text-sm text-muted-foreground">
          Tenant list coming in PC-75.
        </div>
      </main>
    </div>
  );
}
