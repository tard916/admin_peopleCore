"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantPlan } from "@prisma/client";
import { WizardProgress } from "./wizard-progress";
import { StepCompany } from "./step-company";
import { StepPlan } from "./step-plan";
import { StepAdmin } from "./step-admin";
import { StepReview } from "./step-review";
import { createTenantAction } from "../actions";

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  editingFromReview: boolean;
  // Step 1 — Company
  name: string;
  slug: string;
  autoSlug: boolean;
  slugError: string | null;
  // Step 2 — Plan
  plan: TenantPlan;
  // Step 3 — Admin
  firstName: string;
  lastName: string;
  email: string;
  emailError: string | null;
  // Submit
  submitError: string | null;
  isSubmitting: boolean;
}

const INITIAL_STATE: WizardState = {
  step: 1,
  editingFromReview: false,
  name: "",
  slug: "",
  autoSlug: true,
  slugError: null,
  plan: "STARTER",
  firstName: "",
  lastName: "",
  email: "",
  emailError: null,
  submitError: null,
  isSubmitting: false,
};

export function CreateTenantWizard() {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  function onChange(patch: Partial<WizardState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function goToStep(step: 1 | 2 | 3 | 4) {
    setState((s) => ({ ...s, step, editingFromReview: false }));
  }

  function handleNext() {
    if (state.step < 4) {
      const next = (state.step + 1) as 1 | 2 | 3 | 4;
      setState((s) => ({ ...s, step: next, editingFromReview: false }));
    }
  }

  function handleEditFromReview(step: 1 | 2 | 3) {
    setState((s) => ({ ...s, step, editingFromReview: true }));
  }

  function handleSaveAndReturnToReview() {
    setState((s) => ({ ...s, step: 4, editingFromReview: false }));
  }

  async function handleSubmit() {
    setState((s) => ({ ...s, isSubmitting: true, submitError: null }));
    try {
      const result = await createTenantAction({
        name: state.name,
        slug: state.slug,
        plan: state.plan,
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
      });

      if ("ok" in result && result.ok) {
        router.push("/api/flash");
        return;
      }

      if ("errors" in result) {
        const errors = result.errors;
        if (errors.slug) {
          setState((s) => ({ ...s, step: 1, slugError: errors.slug, isSubmitting: false }));
          return;
        }
        if (errors.email) {
          setState((s) => ({ ...s, step: 3, emailError: errors.email, isSubmitting: false }));
          return;
        }
        setState((s) => ({
          ...s,
          submitError: Object.values(errors)[0] ?? "Validation error",
          isSubmitting: false,
        }));
        return;
      }

      if ("error" in result) {
        setState((s) => ({ ...s, submitError: result.error, isSubmitting: false }));
        return;
      }
    } catch {
      setState((s) => ({
        ...s,
        submitError: "Unexpected error. Please try again.",
        isSubmitting: false,
      }));
    }
  }

  return (
    <div>
      <WizardProgress step={state.step} />

      {state.step === 1 && (
        <StepCompany
          state={state}
          onChange={onChange}
          onNext={state.editingFromReview ? handleSaveAndReturnToReview : handleNext}
          editingFromReview={state.editingFromReview}
        />
      )}

      {state.step === 2 && (
        <StepPlan
          state={state}
          onChange={onChange}
          onNext={state.editingFromReview ? handleSaveAndReturnToReview : handleNext}
          onBack={() => goToStep(1)}
          editingFromReview={state.editingFromReview}
        />
      )}

      {state.step === 3 && (
        <StepAdmin
          state={state}
          onChange={onChange}
          onNext={state.editingFromReview ? handleSaveAndReturnToReview : handleNext}
          onBack={() => goToStep(2)}
          editingFromReview={state.editingFromReview}
        />
      )}

      {state.step === 4 && (
        <StepReview
          state={state}
          onEdit={handleEditFromReview}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
