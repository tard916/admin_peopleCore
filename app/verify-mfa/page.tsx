import { VerifyMfaForm } from "./verify-mfa-form";

export const metadata = { title: "Verify identity — PeopleCore Admin" };

export default function VerifyMfaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="eyebrow">Two-factor authentication</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Verify your identity
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
        <VerifyMfaForm />
      </div>
    </div>
  );
}
