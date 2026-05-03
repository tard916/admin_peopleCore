"use client";

const STEP_LABELS: Record<number, string> = {
  1: "Company",
  2: "Plan",
  3: "Admin",
  4: "Review",
};

export function WizardProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="t-small font-medium text-muted-foreground">
        {step} of 4 — {STEP_LABELS[step]}
      </span>
      <div className="flex-1 flex gap-1">
        {([1, 2, 3, 4] as const).map((n) => (
          <div
            key={n}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              background: n <= step ? "var(--color-primary)" : "var(--color-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
