# Clerk setup runbook (admin_peopleCore)

End-to-end setup for a new operator. **Read this fully before running any step.**

## Prerequisites

- Clerk account at https://dashboard.clerk.com
- Vercel CLI installed + authenticated (`vercel login`)
- Access to the `224team/admin-people-core` Vercel project

## Phase 1 — Clerk dashboard setup

### 1.1 Create two Clerk instances

1. **Development instance** — used for local dev + Vercel preview deploys
2. **Production instance** — used for Vercel production

Both go on Clerk's free tier (covers <10K MAUs).

### 1.2 In each instance:

1. **Configure auth methods**: enable Email + Password. Disable other providers unless explicitly needed.
2. **Require email verification**: Settings → Email, Phone, Username → Email address → enable "Verify at sign-up". This is **mandatory** — the lazy-link security model depends on verified emails.
3. **Create the 224tech organization**: Organizations → New organization → name: `224tech`, slug: `224tech`.
4. **Define the `org:admin` role**: Roles → ensure `org:admin` exists (Clerk creates it by default for new orgs). Verify the slug is exactly `org:admin`.
5. **Identify org owners**: assign at least 2 team members the `org:admin` role for bus-factor coverage. Document who they are in your team's password manager.

### 1.3 Configure allowed origins (production instance only)

Production Clerk → Domains → add:
- `https://admin-people-core.vercel.app`
- (any custom domain you use for the admin app)

Do **not** add preview deploy URLs to production. Preview uses the dev instance instead.

### 1.4 Invite admins

In the **production** Clerk dashboard:
- Organizations → 224tech → Members → Invite
- Add `superadmin@224tech.com` and any other team members with `org:admin` role
- Each invitee receives an email with a Clerk-hosted onboarding flow

## Phase 2 — Vercel environment setup

```bash
# Get keys from Clerk dashboard → API Keys
# Production target uses production instance keys
# Preview + Development targets use development instance keys

vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview
vercel env add CLERK_SECRET_KEY preview
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY development
vercel env add CLERK_SECRET_KEY development
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL production preview development
```

Or via Vercel REST API (see git history of PC-79 for the script).

## Phase 3 — Vercel preview protection

Enable **Standard Protection** on preview deploys so dev Clerk keys aren't reachable from public URLs:

1. Vercel → Project → Settings → Deployment Protection
2. Set Preview to "Standard Protection" (Vercel auth required)

## Phase 4 — Cutover

Strict order. Don't skip steps.

1. Verify Phase 1-3 complete
2. **Add new** Vercel env vars (`CLERK_*`) to all targets
3. Merge peopleCore PR (PC-79 — adds `User.clerkId`)
4. Sync admin schema + `prisma generate` in admin_peopleCore
5. Merge admin code PR (Units 2-8)
6. **Verify production sign-in** with the seeded super-admin
7. **Verify impersonation handoff** (if PC-78 has shipped — otherwise compile-check only)
8. Run TOTP zero-fill SQL + rotate `AUTH_SECRET` (Unit 9a)
9. **Remove old** Vercel env vars: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `UPSTASH_*`
10. Final smoke test

**Rollback is impossible after step 8** (AUTH_SECRET rotated). That's the point of no return.

## Operations

### Off-boarding a team member

1. Clerk dashboard → Organizations → 224tech → Members → remove user
2. All their active sessions auto-revoke
3. Optionally: `UPDATE "User" SET "clerkId" = NULL WHERE id = '<user-id>'` (cleanup, not security-critical)

### Force-logout (break-glass)

If an admin account is compromised:

1. Clerk dashboard → Users → find user → "Revoke active sessions"
2. Or via Clerk backend SDK: `await clerkClient.users.revokeSessions(userId)`

The old `User.sessionVersion` tombstone no longer applies — Clerk owns session lifecycle.

### Two sources of admin truth

`User.isSuperAdmin` is **frozen** for new uses. peopleCore may still read it for legacy purposes; do not add new gates against it. Future peopleCore migration plan removes this divergence.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Sign-in succeeds but redirects to `/access-denied?reason=not_provisioned` | Clerk user's email doesn't match any `User.email` row | Add the email to the User table or invite a different account |
| `/access-denied?reason=email_unverified` | "Verify at sign-up" wasn't enabled in Clerk instance | Enable it in Clerk settings, ask user to verify email |
| `/access-denied?reason=identity_conflict` | User row already linked to a different Clerk user | Investigate — may indicate org-transfer attack. Check AuditLog for `admin.clerk_link_conflict` |
| Preview deploys show CORS errors from Clerk | Wrong Clerk instance keys on preview target (using prod keys) | Switch preview target to dev Clerk instance keys |

## References

- Plan: `docs/plans/2026-04-29-001-refactor-clerk-auth-migration-plan.md`
- Clerk Next.js docs: https://clerk.com/docs/nextjs/getting-started/quickstart
- Clerk organizations: https://clerk.com/docs/guides/organizations/overview
