"use client";

import { Button } from "@/components/ui/button";
import { PLAN_METADATA } from "@/lib/plan-metadata";
import type { WizardState } from "./create-tenant-wizard";

interface Props {
  state: WizardState;
  onEdit: (step: 1 | 2 | 3) => void;
  onSubmit: () => void;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="t-small text-muted-foreground">{label}</span>
      <span className="t-small font-medium text-right">{value}</span>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="eyebrow">{title}</span>
        <button
          type="button"
          onClick={onEdit}
          className="t-small text-primary hover:underline"
        >
          Edit
        </button>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export function StepReview({ state, onEdit, onSubmit }: Props) {
  const planMeta = PLAN_METADATA[state.plan];

  return (
    <div className="flex flex-col gap-4">
      <ReviewSection title="Company" onEdit={() => onEdit(1)}>
        <ReviewRow label="Name" value={state.name} />
        <ReviewRow label="Slug" value={state.slug} />
      </ReviewSection>

      <ReviewSection title="Plan" onEdit={() => onEdit(2)}>
        <ReviewRow label="Plan" value={planMeta.label} />
      </ReviewSection>

      <ReviewSection title="First HR Admin" onEdit={() => onEdit(3)}>
        <ReviewRow label="Name" value={`${state.firstName} ${state.lastName}`} />
        <ReviewRow label="Email" value={state.email} />
      </ReviewSection>

      {state.submitError && (
        <p className="t-small text-destructive text-center">{state.submitError}</p>
      )}

      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={state.isSubmitting}
      >
        {state.isSubmitting ? "Creating tenant…" : "Create tenant"}
      </Button>
    </div>
  );
}
