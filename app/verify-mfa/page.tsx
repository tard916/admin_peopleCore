import { VerifyMfaForm } from "./verify-mfa-form";

export const metadata = { title: "Verify identity — PeopleCore Admin" };

export default function VerifyMfaPage() {
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
            <span className="text-[10.5px] text-muted-foreground tracking-[0.07em] uppercase font-medium">Two-factor authentication</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-xl border border-border p-7">
          <h2 className="text-[17px] font-semibold text-foreground tracking-[-0.025em] mb-1.5">Verification code</h2>
          <p className="text-[13px] text-muted-foreground mb-6">Enter the 6-digit code from your authenticator app.</p>
          <VerifyMfaForm />
        </div>

        <div className="text-center mt-3.5">
          <a href="/login" className="text-[12.5px] text-muted-foreground underline underline-offset-[3px]">← Back to sign in</a>
        </div>
      </div>
    </div>
  );
}
