import { redirect } from "next/navigation";
import { getFlashSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tenant created — PeopleCore Admin" };

export default async function OnboardSuccessPage() {
  const flash = await getFlashSession();
  const { tempPassword, tenantSlug, adminEmail } = flash;

  // Clear the flash immediately so it can't be read again
  flash.tempPassword = undefined;
  flash.tenantSlug = undefined;
  flash.adminEmail = undefined;
  await flash.save();

  if (!tempPassword) {
    // Flash already consumed or expired
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold text-foreground">
            Credentials already displayed
          </h1>
          <p className="text-sm text-muted-foreground">
            The temporary password was shown once and cannot be retrieved. If
            you missed it, the HR admin can request a password reset.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <p className="eyebrow">Tenant created</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Onboarding complete
          </h1>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <div className="space-y-1">
            <p className="eyebrow">Tenant slug</p>
            <p className="font-mono text-sm text-foreground">{tenantSlug}</p>
          </div>
          <div className="space-y-1">
            <p className="eyebrow">Admin email</p>
            <p className="text-sm text-foreground">{adminEmail}</p>
          </div>
          <div className="space-y-1">
            <p className="eyebrow">Temporary password</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground break-all select-all">
                {tempPassword}
              </code>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Share this password securely (e.g. 1Password Send — not email). The
            HR admin will be required to change it on first login.
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          This page will not show the password again if you navigate away.
        </p>
      </div>
    </div>
  );
}
