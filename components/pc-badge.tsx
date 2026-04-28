// PeopleCore Admin — plan/status badges and slug chip

const PLAN_CFG: Record<string, { bg: string; color: string }> = {
  FREE:       { bg: "rgba(107,113,144,0.12)", color: "#4E546B" },
  STARTER:    { bg: "rgba(0,40,142,0.1)",     color: "#00288E" },
  GROWTH:     { bg: "rgba(0,106,97,0.1)",     color: "#006A61" },
  ENTERPRISE: { bg: "rgba(0,40,142,0.16)",    color: "#00288E" },
};

const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "rgba(0,106,97,0.12)",  color: "#006A61" },
  SUSPENDED: { bg: "rgba(180,120,0,0.12)", color: "#7A5000" },
  ERROR:     { bg: "rgba(178,30,30,0.12)", color: "#B21E1E" },
};

interface PlanBadgeProps { value: string; className?: string }
export function PlanBadge({ value, className }: PlanBadgeProps) {
  const cfg = PLAN_CFG[value] ?? { bg: "#ECEEF6", color: "#6B7190" };
  return (
    <span
      className={className}
      style={{
        display: "inline-block", padding: "2px 7px", borderRadius: "3px",
        fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
        background: cfg.bg, color: cfg.color,
      }}
    >
      {value}
    </span>
  );
}

export function StatusBadge({ value, className }: PlanBadgeProps) {
  const cfg = STATUS_CFG[value] ?? { bg: "#ECEEF6", color: "#6B7190" };
  return (
    <span
      className={className}
      style={{
        display: "inline-block", padding: "2px 7px", borderRadius: "3px",
        fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
        background: cfg.bg, color: cfg.color,
      }}
    >
      {value}
    </span>
  );
}

export function SlugChip({ value }: { value: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "4px",
      fontSize: "11.5px", fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      background: "#EDEEF5", color: "#6B7190", whiteSpace: "nowrap",
    }}>
      {value}
    </span>
  );
}
