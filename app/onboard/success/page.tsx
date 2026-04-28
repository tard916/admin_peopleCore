import { getFlashSession } from "@/lib/session";
import { OnboardingSuccessClient } from "./onboarding-success-client";

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

  if (!tempPassword || !tenantSlug) {
    // Flash already consumed or expired
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-[460px] text-center">
          <h1 className="text-[20px] font-bold text-foreground tracking-[-0.025em] mb-2">
            Credentials already displayed
          </h1>
          <p className="text-[13px] text-muted-foreground mb-6">
            The temporary password was shown once and cannot be retrieved. If you missed it,
            the HR admin can request a password reset.
          </p>
          <a
            href="/tenants"
            className="inline-block px-5 py-2.5 bg-surface border border-border rounded-md text-[13px] font-medium text-foreground hover:bg-[#EDEEF5] transition-colors"
          >
            Back to tenants
          </a>
        </div>
      </div>
    );
  }

  return (
    <OnboardingSuccessClient
      tenantSlug={tenantSlug}
      adminEmail={adminEmail ?? ""}
      tempPassword={tempPassword}
    />
  );
}
