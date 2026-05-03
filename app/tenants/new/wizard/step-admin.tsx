"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WizardState } from "./create-tenant-wizard";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
  editingFromReview: boolean;
}

export function StepAdmin({ state, onChange, onNext, onBack, editingFromReview }: Props) {
  const { firstName, lastName, email, emailError } = state;
  const [checkingEmail, setCheckingEmail] = useState(false);

  const firstNameError = !firstName.trim() ? "Required" : null;
  const lastNameError = !lastName.trim() ? "Required" : null;
  const emailFormatError =
    email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter a valid email" : null;
  const emailRequiredError = !email.trim() ? "Required" : null;

  const hasError =
    !!firstNameError ||
    !!lastNameError ||
    !!emailFormatError ||
    !!emailRequiredError ||
    !!emailError ||
    checkingEmail;

  const displayEmailError = emailError ?? emailRequiredError ?? emailFormatError;

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ email: e.target.value, emailError: null });
  }

  async function handleEmailBlur() {
    if (!email || emailFormatError || emailRequiredError) return;
    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/tenants/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!data.available) {
        onChange({ emailError: "This email is already registered" });
      } else {
        onChange({ emailError: null });
      }
    } catch {
      // Network error — leave emailError as-is, server will catch on submit
    } finally {
      setCheckingEmail(false);
    }
  }

  function handleNext() {
    if (!hasError) onNext();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-first-name">First name</Label>
          <Input
            id="admin-first-name"
            value={firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            placeholder="Sarah"
            aria-invalid={!!firstNameError && firstName.length > 0}
            autoFocus
          />
          {firstNameError && firstName.length > 0 && (
            <p className="t-small text-destructive">{firstNameError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-last-name">Last name</Label>
          <Input
            id="admin-last-name"
            value={lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            placeholder="Chen"
            aria-invalid={!!lastNameError && lastName.length > 0}
          />
          {lastNameError && lastName.length > 0 && (
            <p className="t-small text-destructive">{lastNameError}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-email">Work email</Label>
        <Input
          id="admin-email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          placeholder="sarah@acme.com"
          aria-invalid={!!displayEmailError}
        />
        {checkingEmail && (
          <p className="t-small text-muted-foreground">Checking availability…</p>
        )}
        {!checkingEmail && displayEmailError && (
          <p className="t-small text-destructive">{displayEmailError}</p>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={handleNext} disabled={hasError}>
          {editingFromReview ? "Save and return to review" : "Next →"}
        </Button>
      </div>
    </div>
  );
}
