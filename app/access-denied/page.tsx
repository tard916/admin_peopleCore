import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";

export const metadata = { title: "Access denied — PeopleCore Admin" };

const COPY: Record<string, { title: string; body: (email: string) => string }> = {
  not_provisioned: {
    title: "Account not provisioned",
    body: (email) =>
      `Your Clerk account ${email} isn't linked to a PeopleCore admin record. Ask another 224tech admin to add your email to the database, or contact tech support.`,
  },
  email_unverified: {
    title: "Email not verified",
    body: () =>
      "Your Clerk email isn't verified yet. Check your inbox for a verification email, then sign in again.",
  },
  identity_conflict: {
    title: "Identity conflict",
    body: () =>
      "This account can't be linked — the matching admin record is already bound to a different Clerk user. This is unusual; contact tech support.",
  },
  default: {
    title: "Access denied",
    body: () =>
      "You don't have admin access. Sign out and try a different account, or contact tech support.",
  },
};

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const variant = COPY[reason ?? ""] ?? COPY.default;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "(unknown)";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px]">
        <div className="bg-surface rounded-xl border border-border p-7">
          <h1 className="t-heading mb-2">{variant.title}</h1>
          <p className="t-small mb-1.5">
            Signed in as <span className="t-mono">{email}</span>
          </p>
          <p className="t-body-muted mb-5">{variant.body(email)}</p>
          <SignOutButton redirectUrl="/login">
            <button className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
