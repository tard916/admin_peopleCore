"use client";

import { Button } from "@/components/ui/button";
import { PLAN_METADATA } from "@/lib/plan-metadata";
import type { TenantPlan } from "@prisma/client";
import type { WizardState } from "./create-tenant-wizard";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
  editingFromReview: boolean;
}

const PLANS: TenantPlan[] = ["FREE", "STARTER", "GROWTH", "ENTERPRISE"];

export function StepPlan({ state, onChange, onNext, onBack, editingFromReview }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const meta = PLAN_METADATA[plan];
          const selected = state.plan === plan;
          return (
            <button
              key={plan}
              type="button"
              onClick={() => onChange({ plan })}
              className={[
                "flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-surface hover:border-primary/40",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 t-small font-semibold"
                  style={{ background: meta.color.bg, color: meta.color.text }}
                >
                  {meta.label}
                </span>
              </div>
              <p className="t-small text-muted-foreground">{meta.tagline}</p>
              <ul className="flex flex-col gap-0.5">
                {meta.bullets.map((b) => (
                  <li key={b} className="t-small flex gap-1.5">
                    <span className="text-muted-foreground">·</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onNext}>
          {editingFromReview ? "Save and return to review" : "Next →"}
        </Button>
      </div>
    </div>
  );
}
