/**
 * Plan metadata for the tenant creation wizard Step 2 plan cards.
 *
 * Color values are copied from components/pc-badge.tsx PLAN_CFG.
 * Both files are independent — if plan colors change, update both.
 * Consolidation of the two color sources is deferred.
 *
 * Copy (taglines + bullets) is placeholder pending 224tech sign-off.
 * Replace before launch — this is a hard blocker for Step 2.
 */

import type { TenantPlan } from "@prisma/client";

export interface PlanMeta {
  label: string;
  tagline: string;
  bullets: string[];
  color: { bg: string; text: string };
}

// Copied from components/pc-badge.tsx PLAN_CFG — keep in sync manually
export const PLAN_METADATA: Record<TenantPlan, PlanMeta> = {
  FREE: {
    label: "Free",
    tagline: "For teams just getting started",
    bullets: [
      "Up to 10 employees",
      "Core HR features",
      "Email support",
    ],
    color: { bg: "rgba(107,113,144,0.12)", text: "#4E546B" },
  },
  STARTER: {
    label: "Starter",
    tagline: "For growing teams that need more",
    bullets: [
      "Up to 50 employees",
      "Leave & attendance management",
      "Payroll processing",
      "Priority support",
    ],
    color: { bg: "rgba(0,40,142,0.1)", text: "#00288E" },
  },
  GROWTH: {
    label: "Growth",
    tagline: "For scaling organisations",
    bullets: [
      "Up to 200 employees",
      "Performance & OKRs",
      "Advanced analytics",
      "Recruitment pipeline",
      "Dedicated support",
    ],
    color: { bg: "rgba(0,106,97,0.1)", text: "#006A61" },
  },
  ENTERPRISE: {
    label: "Enterprise",
    tagline: "For large organisations with complex needs",
    bullets: [
      "Unlimited employees",
      "Custom integrations",
      "SLA guarantee",
      "Onboarding assistance",
      "Account manager",
    ],
    color: { bg: "rgba(0,40,142,0.16)", text: "#00288E" },
  },
};
