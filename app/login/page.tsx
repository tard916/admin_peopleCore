import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — PeopleCore Admin" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  // Already authenticated → go to tenants
  const session = await auth();
  if (
    session?.user &&
    (session.user as { isSuperAdmin?: boolean }).isSuperAdmin
  ) {
    redirect("/tenants");
  }

  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="eyebrow">224tech internal</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            PeopleCore Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your super-admin account
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error === "CredentialsSignin"
              ? "Invalid email or password."
              : "An error occurred. Please try again."}
          </div>
        )}

        <LoginForm />

        <p className="text-center text-xs text-muted-foreground">
          Access restricted to 224tech team members on the office network or
          VPN.
        </p>
      </div>
    </div>
  );
}
