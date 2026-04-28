import Link from "next/link";

export const metadata = { title: "Enroll TOTP — PeopleCore Admin" };

/**
 * TOTP enrollment stub. The full QR + verify flow lands in PC-74.
 * For now this just acknowledges the gate so the proxy redirect resolves.
 */
export default function EnrollTotpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px]">
        <div className="bg-surface rounded-xl border border-border p-7">
          <h1 className="text-[17px] font-semibold text-foreground tracking-[-0.025em] mb-3">
            Two-factor authentication required
          </h1>
          <p className="text-[13px] text-muted-foreground mb-5 leading-relaxed">
            Admin access requires TOTP enrollment. The full enrollment flow
            (QR code, verify, recovery codes) is implemented in PC-74.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
