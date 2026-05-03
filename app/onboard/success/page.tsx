import { OnboardingSuccessClient } from "./onboarding-success-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tenant created — PeopleCore Admin" };

/**
 * Reads one-time tenant credentials from search params set by /api/flash.
 *
 * The flash cookie is read and cleared in the /api/flash Route Handler
 * (not here) because Next.js forbids cookie writes inside Server Component
 * renders — only Server Actions and Route Handlers can write cookies.
 */
export default async function OnboardSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; email?: string; pass?: string }>;
}) {
  const { slug, email, pass } = await searchParams;

  if (!pass || !slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-[460px] text-center">
          <h1 className="t-heading mb-2">Credentials already displayed</h1>
          <p className="t-body-muted mb-6">
            The temporary password was shown once and cannot be retrieved. If you missed it,
            the HR admin can request a password reset.
          </p>
          <a
            href="/tenants"
            className="inline-block px-5 py-2.5 bg-surface border border-border rounded-md t-ui font-medium text-foreground hover:bg-muted transition-colors"
          >
            Back to tenants
          </a>
        </div>
      </div>
    );
  }

  return (
    <OnboardingSuccessClient
      tenantSlug={slug}
      adminEmail={email ?? ""}
      tempPassword={pass}
    />
  );
}
