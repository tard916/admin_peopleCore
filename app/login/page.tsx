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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-[360px]">
        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-7 gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-primary flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="4.5" r="2.5" fill="white" />
              <path d="M1 12c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-[3px]">
            <span className="text-[15px] font-bold text-foreground tracking-[-0.025em]">PeopleCore Admin</span>
            <span className="text-[10.5px] text-muted-foreground tracking-[0.07em] uppercase font-medium">224tech internal</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-xl border border-border p-7">
          <h2 className="text-[17px] font-semibold text-foreground tracking-[-0.025em] mb-5">Sign in</h2>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive mb-4">
              {error === "CredentialsSignin"
                ? "Invalid email or password."
                : "An error occurred. Please try again."}
            </div>
          )}

          <LoginForm />
        </div>

        <p className="text-center text-[11.5px] text-muted-foreground mt-[18px]">
          Access restricted to office network / VPN
        </p>
      </div>
    </div>
  );
}
