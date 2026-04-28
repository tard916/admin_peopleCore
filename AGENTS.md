# admin_peopleCore — Agent & Developer Instructions

## What this repo is

Internal Next.js 16 admin app for the 224tech team to onboard companies to PeopleCore.
**Not publicly accessible** — restricted to 224tech office IP / VPN at CDN layer.

Shares the same Postgres database as `peopleCore`. Never runs `prisma migrate` — schema
is owned by the `peopleCore` repo. Only `prisma generate` is run here.

## Jira traceability — NON-NEGOTIABLE

Every branch, commit, and PR title **MUST** include the Jira ticket key (PC-<n>).

- **Branch**: `<type>/pc-<n>-<short-slug>` — e.g. `feat/pc-68-admin-schema-migrations`
- **Commit**: subject starts with `[PC-<n>]` — e.g. `[PC-73] feat(scaffold): init admin app`
- **PR title**: starts with `[PC-<n>]`
- **PR body**: `Jira: https://224tech.atlassian.net/browse/PC-<n>`

## TDD — NON-NEGOTIABLE

Red → Green → Refactor on every feature, fix, and refactor.

- Server actions and domain logic → **unit tests** (colocated `*.test.ts`)
- Auth flows, TOTP, rate limiting → **unit tests** + at least one integration path
- UI click paths (login, TOTP, create tenant, impersonation) → **Playwright e2e** (`e2e/*.spec.ts`)
- New server actions ship with: happy path + at least one error branch (auth, validation)

Run before opening a PR:
```bash
npm run typecheck
npm run lint
npm run test
```

## Schema ownership

`peopleCore` repo owns ALL migrations. This repo:
- Keeps a **physical copy** of `prisma/schema.prisma` (not a symlink)
- Runs only `npm run db:generate` (`prisma generate`)
- **Never** runs `prisma migrate`

**CI gate**: the CI pipeline diffs `prisma/schema.prisma` against the version in `peopleCore`
and fails if they diverge. Update the copy whenever `peopleCore` ships a migration.

## Security requirements

- HTTPS enforced — hard deployment requirement
- IP allowlist at CDN layer — document in ops runbook, not enforced at app layer
- TOTP required for all super-admin accounts
- Rate limiting on login: 5 attempts / 15 min / IP + per account
- All high-risk actions produce structured AuditLog records

## Next.js version

This app uses **Next.js 16.2.4** (App Router, React 19). APIs differ from older versions.
Read `node_modules/next/dist/docs/` before writing any Next.js-specific code.

## Key decisions (see plan for full rationale)

- `isSuperAdmin Boolean` on User (not a Role enum change)
- MFA challenge creation in server action, NOT in NextAuth `authorize()`
- `PendingMfaChallenge` upserted (not inserted) — handles concurrent browser tabs
- Impersonation token: DB record, single-use, POST body transport (never URL)
- `encode()` from `next-auth/jwt` requires `salt` matching cookie name
- Admin cookie name: `adminjs.session-token` (distinct from peopleCore)
- JWT `aud: 'admin'` — cross-app token isolation
- Temp password: never persisted — passed via iron-session flash cookie

## Plan & tickets

- Plan: `docs/plans/2026-04-28-001-feat-admin-dashboard-plan.md` (in peopleCore repo)
- Epic: PC-67
- Units: PC-68 through PC-78
