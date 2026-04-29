import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in — PeopleCore Admin" };

/**
 * Login page — renders Clerk's hosted <SignIn/> component themed to design tokens.
 * Catch-all route handles Clerk's internal sub-routes (factor-2, recovery, etc.).
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-primary flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="4.5" r="2.5" fill="white" />
              <path
                d="M1 12c0-3.314 2.686-6 6-6s6 2.686 6 6"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-foreground tracking-[-0.025em]">
            PeopleCore Admin
          </span>
          <span className="text-[10.5px] text-muted-foreground tracking-[0.07em] uppercase font-medium">
            224tech internal
          </span>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border border-border bg-surface rounded-xl",
              footer: "hidden",
            },
            variables: {
              colorPrimary: "#00288E",
              colorBackground: "#FFFFFF",
              colorText: "#131B2E",
              borderRadius: "0.5rem",
              fontFamily: "var(--font-sans)",
            },
          }}
        />

        <p className="text-center text-[11.5px] text-muted-foreground">
          Access restricted to office network / VPN
        </p>
      </div>
    </div>
  );
}
