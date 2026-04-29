---
title: "refactor: Migrate admin auth from NextAuth to Clerk"
type: refactor
status: active
date: 2026-04-29
deepened: 2026-04-29
origin: docs/brainstorms/2026-04-28-admin-dashboard-requirements.md  # in peopleCore repo
---

# refactor: Migrate admin auth from NextAuth to Clerk

**Target repo:** `admin_peopleCore`

## Overview

Replace the admin app's NextAuth v5 (credentials + planned TOTP) auth stack with Clerk. The peopleCore app keeps its own NextAuth setup unchanged. The two apps continue to share the same Postgres database and `User` table; the `User` row is the bridge between Clerk identity (admin app) and NextAuth session (peopleCore).

The goal is to delete custom auth complexity (TOTP encryption, rate limiter, JWT cross-app cookie isolation, sessionVersion tombstone, MFA challenge upsert) and inherit it from Clerk — which already provides MFA, recovery codes, organizations, and audit trails.

## Premise Check (Pre-Implementation Decision Point)

This plan throws away recently-shipped work (PC-68 ✅, PC-69 ✅, PC-79 ✅) and the partially-built PC-74. Before merging Unit 1, confirm this is the right move:

- **Cost-to-finish PC-74 + harden the existing stack** (estimated): ~2-4 days of work — TOTP verify action, MFA challenge upsert, recovery code generation/consumption, integration tests. The encryption + schema is already shipped.
- **Cost-to-migrate to Clerk** (this plan): 9 implementation units across admin and peopleCore + operational runbook + ongoing Clerk dashboard ownership.
- **Recurring savings if we migrate**: zero MFA maintenance, zero rate-limit dashboarding, zero TOTP-key rotation operations, audit log via Clerk dashboard.
- **Recurring costs if we migrate**: vendor lock-in (mitigated — only `User.clerkId` couples us); Clerk pricing risk (free tier covers <10K MAU; admin team < 10 people — but free-tier MFA has historically been the first thing SaaS auth vendors move to paid tiers); two sources of admin truth across admin and peopleCore until peopleCore also migrates.

**If you're confident the migration wins on long-term operational cost, proceed. If the answer is "we just don't want to finish PC-74," that's a different (and weaker) premise — say so explicitly so the team can make a clear decision.**

This plan assumes the migration is the right call. Units below execute that decision; they don't re-litigate it.

## Open Architectural Questions (Acknowledged, Not Punted)

These are decisions the recommended-default question flow chose, but they have real downside risk. Captured here so they're visible, not buried:

1. **Single Clerk org with `org:admin` role only (Q1)** — alternative `defense-in-depth` (Clerk role + DB column re-check) was not chosen. Risk: a misconfigured Clerk instance could grant `org:admin` to the wrong account; with no DB-level second check, the admin app trusts Clerk fully. **Mitigation:** runbook lists the org-owner identification step + enables email verification + requires audit logging on every link.
2. **Lazy email-link without webhook sync (Q2)** — webhook sync was deferred. Risk: a Clerk user changes their primary email after the link is established; the helper still resolves by `clerkId` (correct), but if a *new* Clerk user later takes the old email, no auto-relinking happens (also correct — they'd need a new `User` row). The operational assumption is that admin emails are stable. **Mitigation:** documented in runbook; force email changes to go through tech support.
3. **Admin-only migration (Q3)** — `User.isSuperAdmin` becomes "frozen" — peopleCore can keep reading it for legacy purposes but should not add new uses. Risk: drift between Clerk org membership and `isSuperAdmin` over time. **Mitigation:** runbook declares the freeze; future peopleCore migration plan removes the divergence.
4. **PC-69 ImpersonationToken model unchanged (Q4)** — admin (Clerk) mints; peopleCore (NextAuth) consumes. Risk: cross-app trust boundary. **Mitigation:** PC-69 already has `expiresAt` + `usedAt` for replay protection; pre-launch checklist verifies peopleCore enforces both atomically.

If any of these mitigations break under operation, revisit the corresponding Q decision before adding more layers of patches.

## Problem Frame

Current admin auth (PC-68 — landed) has hand-rolled:
- Credentials provider with `isSuperAdmin` gate in `authorize()`
- AES-GCM-encrypted TOTP secrets (`lib/totp.ts`) keyed by `AUTH_SECRET`
- A planned but unimplemented MFA verification flow (`app/verify-mfa/`, `PC-74`)
- A `sessionVersion` tombstone for force-logout
- Rate limiting via Upstash Redis (with a no-op dev fallback added in PC-79)
- Distinct cookie name (`adminjs.session-token`) to prevent collision with peopleCore's `authjs.session-token`
- A custom `currentSuperAdmin()` helper used by every protected route

This stack is correct but expensive to maintain, especially the unfinished TOTP flow. Clerk provides all of it as a managed service. Migrating before TOTP ships avoids investing in a stack we're about to throw away.

## Requirements Trace

- **R1.** Login flow: an admin signs in with email + password (and MFA if enabled) and lands on `/tenants` with a working session. Replaces current NextAuth credentials flow.
- **R2.** Authorization gating moves from the `User.isSuperAdmin` column to Clerk's `org:admin` role. Only members of the 224tech Clerk org with role `org:admin` can access protected routes (per planning Q1).
- **R3.** MFA: TOTP and backup codes are managed by Clerk, replacing the planned PC-74 work. The admin app stops using `TotpRecoveryCode` and `PendingMfaChallenge` Prisma models. The models themselves remain in the Prisma schema (peopleCore may use them later); the `User.totpSecret` / `User.totpEnabled` columns also remain in the schema — see `Scope Boundaries` for the full retention list.
- **R4.** Identity bridge: Clerk users are linked to existing `User` rows by email. First Clerk login on a known email finds the User and stores `clerkId` for subsequent fast lookups (per planning Q2).
- **R5.** Cookie isolation: Clerk's session cookie does not collide with peopleCore's NextAuth cookie. Both apps must continue to coexist on shared infrastructure.
- **R6.** Impersonation (PC-69 / PC-78): the admin app continues to mint `ImpersonationToken` rows; peopleCore consumes them through its existing NextAuth flow. Clerk does not need to know about impersonation (per planning Q4).
- **R7.** Local dev story: a developer can run the admin app locally with Clerk in development mode without provisioning an Upstash account or sharing prod keys.
- **R8.** Production deploy: Vercel deployment at `admin-people-core.vercel.app` continues to work after the migration with no manual user pre-provisioning beyond inviting admins to the Clerk org.
- **R9.** Audit/observability: admin logins, MFA challenges, and role changes are traceable. Clerk's built-in dashboard satisfies this; the local `AuditLog` table is no longer required for auth events but remains for tenant-domain events.

## Scope Boundaries

- peopleCore tenant users **do not** migrate to Clerk in this plan
- Clerk Organizations are used as a single 224tech org, not a per-tenant organization model
- No cross-app SSO between admin and peopleCore — they stay separate identity planes
- The `isSuperAdmin`, `mustChangePassword`, `totpEnabled`, `totpSecret`, `sessionVersion` columns on `User` stay in the schema (peopleCore may still use them); the admin app simply stops reading them
- Clerk Actor Tokens are not used for impersonation — PC-69 model stays as the source of truth

### Deferred to Separate Tasks

- **Schema cleanup** — drop unused TOTP columns from `User` once peopleCore confirms it doesn't need them. Separate plan, after this migration is stable.
- **peopleCore Clerk migration** — captured for future planning; deliberately not scoped here.
- **Clerk webhook backfill** — if/when we want Clerk to be the source of truth for `User` row identity (rather than just bridging by email), a webhook-driven sync. Out of scope; current "lazy email link" decision (Q2) defers this.

## Context & Research

### Relevant Code and Patterns

- `lib/auth.ts` — current NextAuth config (delete after migration)
- `lib/super-admin.ts` — `currentSuperAdmin()` helper called from every protected page/action (rewrite to use Clerk `auth()`)
- `proxy.ts` — Next.js 16 proxy gate using `getToken` from `next-auth/jwt` (replace with `clerkMiddleware()` matchers)
- `app/login/` — credentials login page + server action (delete entirely; Clerk hosts the sign-in surface)
- `app/verify-mfa/`, `app/enroll-totp/` — TOTP enrollment + verify (delete entirely; Clerk owns MFA)
- `app/api/auth/[...nextauth]/route.ts` — NextAuth route handler (delete)
- `lib/totp.ts` — AES-GCM TOTP encryption (delete; Clerk owns)
- `lib/ratelimit.ts` — Upstash limiter (delete; Clerk does built-in rate limiting on its endpoints)
- `lib/session.ts` — iron-session for the temp-password flash cookie (**keep** — unrelated to auth, used for one-time temp password display after tenant creation)
- `app/tenants/`, `app/tenants/[id]/`, `app/tenants/new/`, `app/impersonate/[tokenId]/` — all call `currentSuperAdmin()` (untouched in their own logic; the helper is what changes)
- `components/top-nav.tsx` — calls `auth()` to render user initials/email (rewrite to use Clerk's `<UserButton/>` or `currentUser()`)
- `prisma/schema.prisma` — adds `User.clerkId String? @unique` (one-line schema change)

### Institutional Learnings

- PC-79 surfaced two NextAuth gotchas the migration eliminates entirely: (1) `signIn(redirect:false)` + manual `redirect()` doesn't set the session cookie reliably in NextAuth v5 beta — Clerk has no equivalent footgun; (2) the `proxy.ts` TOTP redirect to `/enroll-totp` created a dead-end loop because the route had no page — Clerk's MFA enrollment is a managed UI we don't have to build.
- The admin app already has cookie-name isolation (`adminjs.session-token`) but Clerk uses its own cookie names (`__session`, `__client_uat_*`) which are fully orthogonal to NextAuth's. Cookie collision is a non-issue post-migration.

### External References

- Clerk Next.js docs: https://clerk.com/docs/references/nextjs/overview
- `clerkMiddleware()`: https://clerk.com/docs/references/nextjs/clerk-middleware
- Server-side `auth()`: https://clerk.com/docs/references/nextjs/auth
- Organizations + roles: https://clerk.com/docs/organizations/overview
- Webhooks (deferred): https://clerk.com/docs/integrations/webhooks/overview

## Key Technical Decisions

- **Single 224tech Clerk org with role-based authz** *(planning Q1)*: gating logic is `auth().has({ role: 'org:admin' })` in middleware + a single `requireSuperAdmin()` helper for server components. Drops `User.isSuperAdmin` from the admin gate path entirely. Single source of truth, simplest mental model.
- **Lazy email-based User linking** *(planning Q2)*: first Clerk login finds `User.email`, stamps `clerkId` on the row, and subsequent requests resolve in one indexed lookup. Works with the seeded `superadmin@224tech.com` row without manual intervention. If no `User` row matches the Clerk user's email, the helper redirects to `/access-denied?reason=not_provisioned` — no auto-creation. **Security guards** (enforced in Unit 4):
  - Only verified primary emails are used (`primaryEmailAddress.verification.status === 'verified'`)
  - Email lookup is case-insensitive (`mode: 'insensitive'`) to avoid case mismatches
  - If the matched `User` row already has a *different* `clerkId` set, refuse to overwrite — redirect to `/access-denied?reason=identity_conflict` and log to `AuditLog` (org-transfer attack defense)
  - Every lazy-link write emits an `AuditLog` row (`action: 'admin.clerk_link'`) so unexpected links are detectable
- **Clerk email verification required**: both Clerk dev and prod instances must have "Require email verification" enabled. Documented in the Unit 2 runbook.
- **Admin-only migration** *(planning Q3)*: peopleCore stays on NextAuth. The two apps share a `User` table via the `clerkId` column for admins and via `email`/`hashedPassword` for tenants — no shared session or token format.
- **Keep PC-69 ImpersonationToken model** *(planning Q4)*: the admin app (Clerk-authed) creates impersonation tokens; peopleCore (NextAuth-authed) consumes them via the URL handoff designed in PC-78. Clerk doesn't see impersonation.
- **Clerk's hosted sign-in flow via `<SignInButton>` / `<SignUpButton>`**: the existing custom login page (PC-79 design work) is replaced with Clerk's hosted account portal, accessed via the header buttons + `<Show when="signed-out">`. The button click opens Clerk's hosted sign-in modal/page (managed UI: password, MFA challenge, recovery codes — no custom rendering). Trade-off: zero login-screen design control; gain managed MFA/recovery-code UI for free. This is intentional — the login surface is exactly the work we're delegating.
- **Modern Clerk component conventions** (per current Clerk Next.js docs):
  - Use `<Show when="signed-in">` / `<Show when="signed-out">` (replaces deprecated `<SignedIn>` / `<SignedOut>`)
  - Use `clerkMiddleware()` from `@clerk/nextjs/server` (replaces deprecated `authMiddleware()`)
  - `<ClerkProvider>` lives **inside** `<body>` in `app/layout.tsx`, not wrapping `<html>`
  - All imports come from `@clerk/nextjs` or `@clerk/nextjs/server` — never deprecated subpaths
- **Two Clerk instances: dev + prod**: developers use a Clerk "development" instance with their own test users. Production uses a "production" instance. Clerk's free tier supports both. Avoids the local-dev friction the current app has with `AUTH_SECRET` matching peopleCore.
- **Delete TOTP code, don't deprecate**: `lib/totp.ts`, `app/verify-mfa/`, `app/enroll-totp/` are removed in this plan. Half-shipped TOTP code is a security risk if it's reachable; Clerk's MFA replaces it cleanly.
- **iron-session stays**: `lib/session.ts` is for the one-time temp password flash cookie shown after tenant creation. It's not auth-related and remains unchanged.

## Open Questions

### Resolved During Planning

- **Authz model** → Clerk org role only (Q1)
- **Identity bridge** → Lazy email link (Q2)
- **Scope** → Admin-only (Q3)
- **Impersonation** → Keep PC-69 unchanged (Q4)
- **Custom vs. managed login UI** → Use Clerk's hosted sign-in flow via `<SignInButton>` / `<SignUpButton>` — no embedded `<SignIn/>` component, no local `/login` route (decision above)
- **Dev/prod environment isolation** → Two Clerk instances (decision above)
- **Old TOTP code** → Delete in this plan (decision above)

### Deferred to Implementation

- **Exact `appearance` theme prop values** for the Clerk component to match design tokens — visual tweaks during the implementation unit, not worth pre-specifying
- **Webhook handler shape** *if* we add Clerk webhook sync later — explicitly out of scope here
- **Whether to drop the unused `User.totpSecret` / `totpEnabled` columns** — separate plan once peopleCore confirms it doesn't need them

## Implementation Units

- [ ] **Unit 1: Add `User.clerkId` column + Prisma migration (peopleCore-first)**

**Goal:** Add the bridge column linking Clerk users to `User` rows. Single column, nullable, `@unique`. **This is the only cross-repo unit in the plan** — acknowledged scope reach into peopleCore because peopleCore owns the schema.

**Requirements:** R4

**Dependencies:** None for the work itself, but **all subsequent units block on the migration being applied to the shared Neon DB** — `clerkId` is read at runtime by Unit 4.

**Files:**
- **peopleCore repo** (where the migration lands):
  - Modify: `prisma/schema.prisma` — add `clerkId String? @unique` and a citext or functional lower-index on `email` (see approach)
  - Create: `prisma/migrations/<timestamp>_pc_NN_add_user_clerk_id/migration.sql`
  - Modify: `prisma/schema.test.ts` — add PC-NN block following PC-68/PC-69 pattern
- **admin_peopleCore repo** (this plan's home):
  - Modify: `prisma/schema.prisma` — copy from peopleCore *after* migration applies
  - Run: `prisma generate` (no `migrate`)

**Approach:**
- Strict ordering: (1) PR in peopleCore lands and migration runs against shared Neon DB → (2) admin_peopleCore schema copy is updated to match and Prisma client regenerated → (3) Units 2-8 unblock
- Add `clerkId String? @unique` to `User` model
- **Email case-insensitivity** (security finding SA-002, scope-guardian F8): the lazy-link query uses Prisma's `mode: 'insensitive'` — no schema change strictly required, but if performance matters later, add a functional index `CREATE UNIQUE INDEX "User_email_lower_idx" ON "User" (LOWER(email))`. Decided in this plan: rely on Prisma's case-insensitive match for now; defer the functional index until measured load demands it.
- `@unique` on `clerkId` so we can `findUnique({ where: { clerkId } })` for fast post-link lookups
- Nullable because peopleCore tenant users will never have a Clerk ID
- **Never run `prisma migrate dev` from admin_peopleCore** — explicit invariant; admin app only ever runs `prisma generate`

**Patterns to follow:**
- PC-68/PC-69 migration files in `peopleCore/prisma/migrations/` for naming + structure
- `peopleCore/prisma/schema.test.ts` PC-69 block for the SQL-assertion test pattern

**Test scenarios:**
- Happy path: DMMF reflects new `clerkId` field as a scalar `String`
- Migration SQL: contains `ADD COLUMN "clerkId" TEXT` and a unique index `User_clerkId_key`
- Edge: `clerkId` is nullable (no `NOT NULL` in migration SQL)

**Verification:**
- `npx vitest run prisma/schema.test.ts` passes
- `npx prisma migrate dev` runs cleanly against the shared Neon DB
- Both repos' generated Prisma client contains `clerkId`

---

- [ ] **Unit 2: Install Clerk + add env scaffolding**

**Goal:** Get `@clerk/nextjs` installed and `.env.example` updated. No code wired yet — this unit is purely setup so subsequent units have a working dep tree.

**Requirements:** R7, R8

**Dependencies:** None (parallel with Unit 1)

**Files:**
- Modify: `package.json` (add `@clerk/nextjs`)
- Modify: `package-lock.json`
- Modify: `.env.example` (add Clerk vars; remove NextAuth vars)
- Create: `docs/runbooks/clerk-setup.md` (one-page operator runbook for creating dev + prod Clerk instances + inviting admins to the 224tech org)

**Approach:**
- Required Clerk env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Optional: `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/tenants` (where to land after Clerk's hosted sign-in succeeds). Do NOT set `NEXT_PUBLIC_CLERK_SIGN_IN_URL` — there is no local `/login` route in this plan; sign-in is fully hosted by Clerk.
- **Pin `@clerk/nextjs` to a major version known to support Next.js 16.2 + Turbopack** (latest at planning time; verify on Clerk's release notes during implementation). Smoke-test after install: `npm run dev` (turbopack) + `npm run build` both succeed
- The runbook documents:
  1. Creating dev + prod Clerk instances
  2. Creating the single 224tech org in each
  3. Defining the `org:admin` role in each
  4. **Enabling "Require email verification"** in both instances
  5. Identifying ≥2 Clerk org owners for bus-factor coverage
  6. Inviting `superadmin@224tech.com` and other team members to prod
  7. Vercel env-var ordering (the per-target distinction documented in Unit 9b)
  8. Off-boarding procedure (remove user from Clerk org → sessions auto-revoke)
  9. Force-logout break-glass (Clerk dashboard / API)
- Keep `IRON_SESSION_SECRET` and `DATABASE_URL` env vars; remove `AUTH_SECRET`, `NEXTAUTH_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (in Unit 9b, after Unit 9a rotation)

**Patterns to follow:**
- Existing `.env.example` structure (admin_peopleCore)

**Test scenarios:**
- Test expectation: none — pure dependency + docs change with no behavioral code

**Verification:**
- `npm install` clean
- `.env.example` documents Clerk vars and notes which old vars to remove
- Runbook reads as something a new operator could follow without external context

---

- [ ] **Unit 3: Replace `proxy.ts` gate with `clerkMiddleware()`**

**Goal:** The route gate that determines who reaches protected pages now uses Clerk. Drop the NextAuth `getToken()` + `isSuperAdmin` flag check.

**Requirements:** R2, R5

**Dependencies:** Unit 2 (Unit 7 is a co-deploy: this unit redirects to `/access-denied` which Unit 7 creates; both must land together for the redirect target to resolve)

**Execution note:** Test-first — write the route-matching expectations first, then the proxy. The matcher rules are easy to get subtly wrong (public path leaks, missing `/api/*` exclusions).

**Files:**
- Replace: `proxy.ts`
- Test: `proxy.test.ts` (new — the current proxy has no tests; add them as part of this swap)

**Approach:**
- Use `clerkMiddleware((auth, req) => { ... })` from `@clerk/nextjs/server` to gate non-public routes (NOT the deprecated `authMiddleware()`)
- Public routes: `/`, Clerk's own auth pages (sign-in / sign-up are hosted by Clerk, not local routes), `/api/webhooks/*` (reserved for future)
- Protected routes redirect unauthenticated requests via Clerk's `auth.protect()` (raises a 404/redirect)
- After authentication, check `auth().has({ role: 'org:admin' })` — if false, redirect to `/access-denied` (Unit 7)
- No need for cookie-name distinction; Clerk's `__session` cookie is namespaced by Clerk
- Use the modern matcher pattern (per current Clerk Next.js quickstart):
  ```
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ]
  ```

**Patterns to follow:**
- Current `proxy.ts` matcher config
- Clerk's `clerkMiddleware()` examples from external references above

**Test scenarios:**
- Happy path: authenticated `org:admin` reaches `/tenants` → 200 (or pass-through; verify with mocked auth)
- Edge: unauthenticated request to `/tenants` → Clerk's hosted sign-in (via `auth.protect()`)
- Edge: authenticated user *without* `org:admin` role → redirects to `/access-denied`
- Edge: Clerk's hosted sign-in pages (handled by Clerk, not local routes) are unreachable from our matcher (Clerk owns those URLs)
- Integration: `/api/webhooks/clerk` (when added later) bypasses the gate
- Edge: static assets (`/_next/static/*`) are matcher-excluded

**Verification:**
- All proxy tests pass
- Manual smoke: signed-out user hitting `/tenants` is redirected to Clerk's hosted sign-in; signed-in admin reaches the page

---

- [ ] **Unit 4: Replace `lib/auth.ts` and `lib/super-admin.ts` with Clerk equivalents**

**Goal:** Server-side helpers that pages and server actions call (`currentSuperAdmin()`) now resolve identity through Clerk + the `clerkId` bridge.

**Requirements:** R2, R4

**Dependencies:** Unit 1, Unit 2

**Execution note:** Test-first — this is the auth-gate boundary. Wrong behavior here is a security bug. Pin every branch (no Clerk session, Clerk user not in org, org member without admin role, Clerk user with no matching `User` row, Clerk user with matching row but no `clerkId` yet) before writing the implementation.

**Files:**
- Replace: `lib/super-admin.ts` (rewrite `currentSuperAdmin()` against Clerk)
- Delete: `lib/auth.ts` (NextAuth config — no longer needed)
- Test: `lib/super-admin.test.ts` (new)

**Approach:**
- Branching logic for `currentSuperAdmin()` — guards short-circuit; success path falls through:
  1. `const { userId, has } = await auth()` (Clerk's server helper)
  2. **Guard:** if no `userId` → `auth.protect()` (Clerk redirects to its hosted sign-in)
  3. **Guard:** if `!has({ role: 'org:admin' })` → `redirect("/access-denied")`
  4. **Fast path:** `findUnique({ where: { clerkId: userId } })`. If found → return.
  5. **Lazy-link path:** call `currentUser()`. If `primaryEmailAddress.verification.status !== 'verified'` → `redirect("/access-denied?reason=email_unverified")`.
  6. Look up `User` by lowercased email: `findFirst({ where: { email: { equals: clerkEmail, mode: 'insensitive' } } })`.
  7. If no row found → `redirect("/access-denied?reason=not_provisioned")`.
  8. If row found but `row.clerkId != null && row.clerkId !== userId` → log to `AuditLog` (`admin.clerk_link_conflict`) and `redirect("/access-denied?reason=identity_conflict")`.
  9. Update `clerkId = userId` inside a `try/catch`. On unique-violation (concurrent first-login race), re-read by `clerkId` and use that row.
  10. Emit `AuditLog` row (`action: 'admin.clerk_link'`, `actorId: row.id`, `after: { clerkId: userId }`).
  11. Return `{ id, email, name }`.
- Returned shape stays compatible with current callers; verify with `tsc --noEmit`.
- The old `User.isSuperAdmin`, `sessionVersion`, `totpEnabled` columns are not read by this function (Clerk owns authz).
- **Defense-in-depth:** every server action that mutates data (`createTenantAction`, `mintImpersonationToken`, etc.) calls `currentSuperAdmin()` as its first statement. Middleware alone is insufficient — added to the project review checklist.

**Patterns to follow:**
- Current `currentSuperAdmin()` signature (callers don't change)
- `peopleCore/lib/super-admin.ts` style if any exists; otherwise the existing function shape

**Test scenarios:**
- Happy path: Clerk user with `org:admin` role + matching `User.clerkId` → returns `{ id, email, name }`; no DB write
- Happy path: Clerk user + verified email matches `User.email` (no `clerkId` yet) → links + returns; verify Prisma `update` is called once
- Happy path: email lookup is case-insensitive — Clerk email `Admin@224tech.com` matches DB row `admin@224tech.com`
- Edge: no Clerk session → redirects to `/login`
- Edge: Clerk session present but no `org:admin` role → redirects to `/access-denied`
- Edge: no matching `User` (neither `clerkId` nor `email` match) → redirects to `/access-denied?reason=not_provisioned`
- Edge: `primaryEmailAddress.verification.status !== 'verified'` → redirects to `/access-denied?reason=email_unverified` even if email matches a row
- Error path (org-transfer attack): row exists with non-null `clerkId` belonging to a *different* Clerk user → redirects to `/access-denied?reason=identity_conflict`; `AuditLog` row written
- Error path (race): two concurrent first-login requests for the same User row both attempt to set `clerkId` — one succeeds, the other catches the unique-violation and re-reads by `clerkId`; both return the same User
- Integration: after a successful lazy-link, a second request by the same Clerk user resolves via `clerkId` lookup (Prisma log shows `findUnique({ where: { clerkId } })`, no email-path query)
- Integration: every successful lazy-link writes one `AuditLog` row with `action: 'admin.clerk_link'`

**Verification:**
- `lib/super-admin.test.ts` passes (new test file)
- Every existing call site of `currentSuperAdmin()` still type-checks (signature compatible)

---

- [ ] **Unit 5: Wrap layout in `<ClerkProvider>` and use Clerk's hosted sign-in flow**

**Goal:** `<ClerkProvider>` mounts inside `<body>` in the root layout; the sign-in / sign-up flow uses Clerk's hosted UI via `<SignInButton>` / `<SignUpButton>` in the top nav.

**Requirements:** R1

**Dependencies:** Unit 2 (only — does not depend on Unit 3 middleware; smoke-testing end-to-end requires Unit 3, but the unit itself can land independently)

**Files:**
- Modify: `app/layout.tsx` (wrap children in `<ClerkProvider>` *inside* `<body>`)
- Modify: `components/top-nav.tsx` (add `<Show when="signed-out">` with `<SignInButton>` and `<SignUpButton>`; existing user menu becomes the `<Show when="signed-in">` branch — overlaps Unit 6)
- Delete: `app/login/page.tsx`
- Delete: `app/login/login-form.tsx`
- Delete: `app/login/actions.ts`
- Delete: `app/login/` (entire directory)

**Approach:**
- `<ClerkProvider>` reads `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` automatically; no config needed in dev
- Match the canonical Clerk Next.js layout shape:
  ```tsx
  // app/layout.tsx (directional sketch — not implementation)
  import { ClerkProvider } from '@clerk/nextjs'
  
  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body>
          <ClerkProvider>
            {children}
          </ClerkProvider>
        </body>
      </html>
    )
  }
  ```
- Sign-in / sign-up flow is **fully hosted by Clerk** — no local `/login` page, no `<SignIn/>` component embedded in our app. `<SignInButton>` opens Clerk's hosted modal/page; on success, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/tenants` returns the user to the right place.
- Use modern Clerk components per current Clerk docs:
  - `<Show when="signed-in">` / `<Show when="signed-out">` (NOT deprecated `<SignedIn>` / `<SignedOut>`)
  - `<SignInButton>` and `<SignUpButton>` for the sign-out branch
  - `<UserButton>` for the sign-in branch (covered in Unit 6)
- All Clerk imports come from `@clerk/nextjs` (client components) or `@clerk/nextjs/server` (server helpers like `auth()`)
- The existing custom login UI (PC-79 design work) is intentionally discarded — Clerk owns this surface entirely
- **Brand seam acknowledgment**: pre-login users see Clerk's hosted account portal (no theming reaches there, just colors via Clerk dashboard settings), post-login users see PC-79's custom design. This seam is intentional and unavoidable with the hosted flow. If users object, the escape hatch is to add `<SignIn/>` as an embedded component in a custom route — but this plan deliberately avoids that path.

**Patterns to follow:**
- Current Clerk Next.js quickstart layout pattern (`<ClerkProvider>` inside `<body>`, `<Show>` + buttons in the header)
- The canonical `<ClerkProvider>` placement (inside `<body>`) per current Clerk Next.js docs

**Test scenarios:**
- Happy path: signed-out user sees `<SignInButton>` / `<SignUpButton>` rendered in the nav
- Happy path: clicking `<SignInButton>` opens Clerk's hosted sign-in flow
- Edge: already-authenticated admin hitting any URL is not bounced to a sign-in page (Clerk's session is restored automatically)
- Test expectation for the hosted sign-in UI: none in unit tests — verify by manual smoke during implementation (Clerk owns the surface)

**Verification:**
- Sign-in works end-to-end against Clerk dev instance
- The `app/login/` directory is fully removed from the repo

---

- [ ] **Unit 6: Top-nav `<UserButton>` + `<Show>` pattern**

**Goal:** The top nav uses Clerk's `<UserButton>` for the signed-in branch and `<SignInButton>` / `<SignUpButton>` for the signed-out branch (consolidates the Show/SignInButton work introduced in Unit 5).

**Requirements:** R1, R3

**Dependencies:** Unit 5

**Files:**
- Modify: `components/top-nav.tsx`

**Approach:**
- Final shape (directional):
  ```tsx
  import { Show, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs'
  // ... in the nav header:
  <Show when="signed-out">
    <SignInButton />
    <SignUpButton />
  </Show>
  <Show when="signed-in">
    <UserButton />
  </Show>
  ```
- Replace the manual initials + email rendering with `<UserButton>` (Clerk's pre-built avatar + menu)
- Use `currentUser()` from `@clerk/nextjs/server` if any name display in the breadcrumb area is still needed
- The `<UserButton>` menu surfaces "Manage account" → MFA setup, recovery codes, password change — all managed by Clerk

**Patterns to follow:**
- The canonical layout pattern from current Clerk Next.js docs (`Show` + button pair in the header)

**Test scenarios:**
- Happy path: signed-in admin sees `<UserButton>` rendered in the nav
- Happy path: signed-out user sees `<SignInButton>` / `<SignUpButton>` rendered in the nav
- Test expectation for the menu contents: none — that's Clerk's UI surface, not ours

**Verification:**
- Manual smoke: clicking the user button opens Clerk's account menu; sign-out logs the user out and shows the sign-in buttons in the nav

---

- [ ] **Unit 7: Add `/access-denied` page**

**Goal:** A dead-simple page rendered when a signed-in Clerk user lacks the `org:admin` role or has no matching `User` row.

**Requirements:** R2

**Dependencies:** Unit 3 (proxy redirects here), Unit 4 (super-admin helper redirects here)

**Files:**
- Create: `app/access-denied/page.tsx`

**Approach:**
- Simple server component, no auth check
- Reads `?reason=` query param. **Per-reason copy** (the audience is internal super-admins; "Contact your admin" is incoherent because they ARE the admin):
  - `not_provisioned`: "Your Clerk account `{email}` isn't linked to a PeopleCore admin record. Ask another 224tech admin to add your email to the database, or contact tech support."
  - `email_unverified`: "Your Clerk email isn't verified yet. Check your inbox for a verification email, then sign in again."
  - `identity_conflict`: "This account can't be linked — the matching admin record is already bound to a different Clerk user. This is unusual; contact tech support."
  - `default` (no reason): "You don't have admin access. Sign out and try a different account, or contact tech support."
- Each variant displays the signed-in Clerk email so users can confirm which account is signed in
- Renders Clerk's `<SignOutButton/>` ("Sign in as a different account") plus an explicit "Sign out" link to the home page

**Patterns to follow:**
- Existing `app/enroll-totp/page.tsx` stub layout (which gets deleted in Unit 8)

**Test scenarios:**
- Happy path: visiting `/access-denied` renders without auth check
- Edge: `?reason=not_provisioned` shows the provisioning-specific message
- Edge: missing `reason` query param shows the generic message

**Verification:**
- Page renders for both reason states
- Sign-out from this page returns the user to Clerk's hosted sign-in

---

- [ ] **Unit 8: Delete dead NextAuth, TOTP, MFA, and rate-limiter code**

**Goal:** Remove the now-dead stack so it can't be reached by mistake or revived accidentally.

**Requirements:** R3 (TOTP managed by Clerk now)

**Dependencies:** All previous units land first.

**Files:**
- Delete: `lib/auth.ts`
- Delete: `lib/totp.ts`
- Delete: `lib/ratelimit.ts`
- Delete: `app/api/auth/[...nextauth]/route.ts` (and parent directory)
- Delete: `app/verify-mfa/` (page + form + actions)
- Delete: `app/enroll-totp/`
- Modify: `package.json` (remove `next-auth`, `@auth/core`, `@upstash/ratelimit`, `@upstash/redis`, `otplib`, `qrcode`). **Keep `bcryptjs`** — `app/tenants/new/actions.ts` still hashes the temp password into the new HR-admin `User.hashedPassword` row, which peopleCore's NextAuth validates. Removing `bcryptjs` would break tenant creation.
- Modify: `package-lock.json`

**Approach:**
- After `npm uninstall`, run `npx tsc --noEmit` and verify zero errors
- Run `npm run build` and verify zero references to removed modules
- Keep `iron-session` (used by the temp-password flash cookie in `lib/session.ts`)
- Keep `bcryptjs` (decided up-front, not deferred — see Files note above)

**Patterns to follow:**
- N/A — this is purely a deletion + verification unit

**Test scenarios:**
- Happy path: `npm run build` passes after deletions
- Happy path: `npx tsc --noEmit` clean
- Edge: no remaining import of any deleted module (grep for `next-auth`, `@auth/core`, `otplib`, `@upstash` returns nothing in `app/`, `lib/`, `components/`)

**Verification:**
- Bundle size reduces (Clerk's runtime is a single dep; the deletion list is 6+ deps)
- All e2e flows from Units 3-7 still pass

---

- [ ] **Unit 9a: Zero out admin TOTP ciphertext + rotate `AUTH_SECRET`**

**Goal:** After the admin app no longer reads encrypted TOTP secrets, scrub the now-orphaned ciphertext and rotate the encryption key so the data cannot be recovered if `AUTH_SECRET` ever leaks.

**Requirements:** R3 (security hardening of the deferred schema columns)

**Dependencies:** Unit 8 (TOTP code deleted)

**Files:**
- Create: `prisma/migrations/<timestamp>_pc_NN_clear_admin_totp_ciphertext/migration.sql` (in peopleCore — operator-driven runbook step)

**Approach:**
- One-off SQL run in peopleCore against shared Neon: `UPDATE "User" SET "totpSecret" = NULL, "totpEnabled" = false WHERE "isSuperAdmin" = true;` — only touches admin rows; tenant users (where peopleCore may eventually use TOTP) are untouched
- Then rotate `AUTH_SECRET` in peopleCore env (and remove from admin env in Unit 9b) — invalidates any lingering ciphertext encrypted with the old key
- Documented as a runbook step in `docs/runbooks/clerk-setup.md`, not a code change

**Test scenarios:**
- Test expectation: none — operator runbook step. Verification is post-migration SQL: `SELECT count(*) FROM "User" WHERE "isSuperAdmin" = true AND "totpSecret" IS NOT NULL` returns 0.

**Verification:**
- Post-migration query returns 0
- `AUTH_SECRET` rotated in peopleCore prod env
- Audit log entry for the maintenance operation

---

- [ ] **Unit 9b: Update Vercel envs**

**Goal:** Production and preview environments have the right Clerk keys and the obsolete NextAuth/Upstash keys are removed (or at least no longer required).

**Requirements:** R8

**Dependencies:** Unit 8 (don't remove old keys until the code that reads them is gone)

**Files:**
- Modify: `docs/runbooks/clerk-setup.md` (extend with the Vercel env list)

**Approach:**
- Per-target Clerk keys (the production instance is *not* used on preview):
  - **Production target** → Clerk **production** instance keys; allowed-origins list contains `admin-people-core.vercel.app` + custom domain only
  - **Preview target** → Clerk **development** instance keys (preview URLs are unique per deploy and would fail Clerk prod's allowed-origins check)
  - **Development target** → Clerk dev instance keys (developers use their own test users)
- **Vercel deployment protection on preview**: enable Vercel "Standard Protection" on preview deploys so dev Clerk keys aren't reachable from a public URL. Documented in the runbook.
- Remove from all targets: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (added in PC-79). Removal happens **after** Unit 9a rotates `AUTH_SECRET`.
- Keep: `DATABASE_URL`, `IRON_SESSION_SECRET`, `PEOPLECORE_URL`, `ADMIN_APP_URL`
- **Ordering invariant**: don't remove `AUTH_SECRET` until both Unit 8 (code deletion) and Unit 9a (rotation) have shipped. Rollback to NextAuth code requires the old secret; once 9a runs, that's permanently impossible — make that crossing deliberate, not accidental.

**Patterns to follow:**
- The PC-79 token-based REST API workflow that was used to set the original env vars (see chat history of that work)

**Test scenarios:**
- Test expectation: none — operator/runbook task with no application code

**Verification:**
- `vercel env ls` shows the right shape on all three targets
- Production deploy succeeds; clicking `<SignInButton>` redirects to Clerk's production-instance hosted sign-in page

---

## System-Wide Impact

- **Interaction graph:** the auth gate moves from `proxy.ts` (NextAuth `getToken`) → `clerkMiddleware()`. Every protected page indirectly depends on this gate via `currentSuperAdmin()`. The signature of `currentSuperAdmin()` stays the same so callers are insulated.
- **Error propagation:** Clerk's `auth()` doesn't throw on missing session — it returns `{ userId: null }`. Pages must redirect on null, not assume presence. Today's NextAuth `auth()` returns `null` on missing session too, so the pattern is identical.
- **State lifecycle risks:** the `User.clerkId` lazy-link write happens on first authenticated request. Two concurrent first-requests could both attempt to set `clerkId` — Prisma's `@unique` constraint means the second one fails. Implementation should catch the unique-violation and re-read the row. Documented in Unit 4.
- **API surface parity:** peopleCore's `User.isSuperAdmin` continues to exist and may be set on rows that have no `clerkId`. That's fine — peopleCore doesn't read `clerkId` and admin doesn't read `isSuperAdmin` for gating after this migration. Two non-overlapping authz surfaces sharing one table.
- **Integration coverage:** Unit 3 (proxy) and Unit 4 (super-admin) need integration tests with mocked Clerk session, not just unit tests of pure functions. Caller-side compile compatibility is a unit test; full request → middleware → page is integration.
- **Schema & Authorization Invariants:**
  - **Schema:** the `User`, `ImpersonationToken`, `PendingMfaChallenge`, `TotpRecoveryCode` Prisma models are not deleted; the `User.isSuperAdmin`, `mustChangePassword`, `totpSecret`, `totpEnabled`, `sessionVersion` columns also remain (Unit 9a zero-fills `totpSecret` for admin rows but the column stays).
  - **Authorization:** the admin app no longer reads `User.isSuperAdmin` for gating; Clerk's `org:admin` role is sole source. peopleCore's NextAuth flow continues to use `User.hashedPassword` for tenant logins.
  - `peopleCore` auth is unaffected by this plan (any change there is out of scope).
  - The shared `DATABASE_URL` between admin and peopleCore continues to point at the same Postgres.
  - `iron-session` for the temp-password flash cookie continues to work unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Operator forgets to invite `superadmin@224tech.com` to the Clerk org → first deploy is unusable | Runbook (Unit 2) lists this as step 1; deploy verification (Unit 9) requires a successful login as the smoke test |
| Lazy email-link race writes `clerkId` twice | Wrap in `try/catch` for unique-violation; on retry, re-read the row by `clerkId`. Documented in Unit 4. |
| Clerk service outage takes admin app offline | Acceptable — admin tooling is internal-only and can tolerate occasional dependency. peopleCore (the customer-facing app) doesn't depend on Clerk. |
| `superadmin@224tech.com` Clerk account email differs from DB email by case | **Code-level fix** (Unit 4): use Prisma `mode: 'insensitive'` for the email lookup. Runbook also documents the convention. |
| Account-takeover via Clerk org invite of a privileged email | **Code-level guards** (Unit 4): require verified email + refuse identity-conflict overwrite + AuditLog every link. Runbook controls who can invite to the Clerk org. |
| Lingering AUTH_SECRET-encrypted TOTP ciphertext in DB after code deletion | Unit 9a zero-fills admin rows + rotates AUTH_SECRET before old env vars are removed. |
| Force-logout capability lost (no more sessionVersion tombstone) | Documented break-glass procedure (Clerk dashboard "Revoke sessions") in runbook. |
| Vercel preview URL reaches Clerk prod and fails CORS | Per-target Clerk keys: preview uses dev instance; prod uses prod instance. Vercel Standard Protection on preview prevents leak of dev keys via public preview URLs. |
| `next 16.2.4 + turbopack` compatibility with `@clerk/nextjs` | Pin a specific `@clerk/nextjs` major in Unit 2. Smoke step: `npm run dev` + `npm run build` both succeed with `clerkMiddleware` before merging Unit 3. |
| Two sources of admin truth (Clerk org membership vs. `User.isSuperAdmin` in peopleCore) | `User.isSuperAdmin` declared **frozen** for new uses; documented in runbook. Future peopleCore migration plan removes the divergence. |
| Cost — Clerk's free tier limits | Free tier covers 10K MAUs; admin team is < 10 people. Effectively free indefinitely. |
| Lock-in to Clerk if we want to migrate again later | Acceptable — `User.clerkId` is the only schema dependency. Removing Clerk later means re-implementing identity, but the data model is portable. |
| `bcryptjs` and `next-auth` removal breaks tenant creation if the temp-password generation depends on either | Verify in Unit 8 before deletion; keep `bcryptjs` if `app/tenants/new/actions.ts` still hashes the temp password for the User row (likely yes, since the tenant's HR admin still logs into peopleCore via NextAuth). Documented in Unit 8 approach. |

## Documentation / Operational Notes

- **Pre-launch checklist** (lives in the runbook, not this plan) — strict order, **don't skip steps**:
  1. Create Clerk dev + prod instances
  2. Configure `org:admin` role in both; **enable "Require email verification"** in both
  3. Identify Clerk org owners (≥2 people for bus-factor) — document in runbook
  4. Invite all current super-admins to the prod Clerk org
  5. **Add new** Vercel env vars (`CLERK_*`) for prod and preview targets — leave old NextAuth vars in place for rollback
  6. Enable Vercel Standard Protection on preview deploys
  7. Merge peopleCore migration PR (Unit 1) → confirm migration applied to shared Neon DB
  8. Sync admin schema + `prisma generate` in admin_peopleCore
  9. Merge admin code PR (Units 2-8)
  10. Verify production sign-in with the seeded super-admin
  11. Verify impersonation handoff: admin mints token → URL → peopleCore consumes (was Unit 10; verification step, not an implementation unit). If PC-78 isn't shipped, this step is a compile-check only — note it and proceed.
  12. Run Unit 9a (zero-fill TOTP ciphertext + rotate `AUTH_SECRET`)
  13. **Remove old** Vercel env vars (`AUTH_SECRET`, `NEXTAUTH_SECRET`, `UPSTASH_*`)
  14. Final smoke test
- **Rollback procedure** (must be tested before launch):
  - Revert admin code PR to restore NextAuth code paths
  - Restore old env vars from a saved copy (kept by an org owner, not in git)
  - Note: rollback is **impossible** after step 12 (AUTH_SECRET rotated). Step 12 is the point of no return.
- **Off-boarding runbook** (Clerk dashboard task — formerly a SQL update):
  - Org owner removes the user from Clerk org → all their sessions auto-revoke
  - Optionally: set `clerkId = NULL` on their User row (cleanup, not security-critical)
- **Force-logout (break-glass)**:
  - Clerk dashboard → User → "Revoke active sessions"
  - Or via Clerk API: `users.revokeSessions(userId)`
  - Documented because the old `sessionVersion` tombstone is gone — operators need to know how
- **Two sources of admin truth** (acknowledged): until peopleCore migrates to Clerk too, `User.isSuperAdmin` is **frozen** — peopleCore must not add new uses of it. New super-admin gating in peopleCore should consult a future Clerk-webhook-synced flag, not `isSuperAdmin`. Tracked in deferred work.
- **Post-migration cleanup** (deferred):
  - Drop `User.mustChangePassword` columns once peopleCore confirms it doesn't need them. Separate plan.
  - `User.totpSecret`/`totpEnabled` zero-filled in Unit 9a but column drop deferred (peopleCore may resume use later).

## Sources & References

- **Origin requirements:** `peopleCore/docs/brainstorms/2026-04-28-admin-dashboard-requirements.md`
- **Origin plan:** `peopleCore/docs/plans/2026-04-28-001-feat-admin-dashboard-plan.md`
- **PC-68 schema (User admin fields):** PR #62 in peopleCore
- **PC-69 schema (Impersonation/MFA models):** PR #64 in peopleCore
- **PC-79 login fixes:** PR #4 and PR #5 in admin_peopleCore (added `.env`, fixed proxy/middleware, fixed Tailwind prod build, set Vercel env vars)
- **Clerk Next.js docs:** https://clerk.com/docs/references/nextjs/overview
- **Clerk middleware:** https://clerk.com/docs/references/nextjs/clerk-middleware
- **Clerk organizations:** https://clerk.com/docs/organizations/overview
