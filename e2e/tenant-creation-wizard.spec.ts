/**
 * e2e: Tenant creation wizard (PC-83)
 *
 * These tests drive the full click path of the 4-step wizard. They run
 * against a live dev server (BASE_URL env or localhost:3001) and require
 * a valid Clerk super-admin session to be set up via storageState.
 *
 * NOTE: This spec covers the wizard UI flow. The server action is unit-tested
 * in app/tenants/new/actions.test.ts. The auth cookie setup for CI is tracked
 * in a follow-up task.
 *
 * Run locally: npx playwright test e2e/tenant-creation-wizard.spec.ts
 */

import { test, expect } from "@playwright/test";

const UNIQUE = `e2e-${Date.now()}`;

test.describe("Tenant creation wizard", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the wizard page — requires auth in full e2e runs
    await page.goto("/tenants/new");
  });

  test("shows step 1 of 4 progress indicator on load", async ({ page }) => {
    await expect(page.getByText("1 of 4")).toBeVisible();
    await expect(page.getByText("Company")).toBeVisible();
  });

  test("Next button disabled until company name and slug are filled", async ({ page }) => {
    const nextBtn = page.getByRole("button", { name: /Next/i });
    await expect(nextBtn).toBeDisabled();

    await page.getByLabel("Company name").fill("Acme Corp");
    // slug auto-derived, Next should now be enabled (no async check while typing)
    await expect(nextBtn).toBeEnabled();
  });

  test("slug auto-derives from company name", async ({ page }) => {
    await page.getByLabel("Company name").fill("Acme Corp");
    await expect(page.getByLabel("Slug")).toHaveValue("acme-corp");
  });

  test("slug manual override breaks auto-derive", async ({ page }) => {
    await page.getByLabel("Company name").fill("Acme Corp");
    const slugInput = page.getByLabel("Slug");
    await slugInput.fill("custom-slug");
    // Now change name — slug should not update
    await page.getByLabel("Company name").fill("New Name");
    await expect(slugInput).toHaveValue("custom-slug");
  });

  test("shows slug format error for invalid characters", async ({ page }) => {
    await page.getByLabel("Slug").fill("INVALID SLUG!");
    await page.getByLabel("Slug").blur();
    await expect(page.getByText("Lowercase letters, numbers, and hyphens only")).toBeVisible();
  });

  test("navigates through all 4 steps", async ({ page }) => {
    // Step 1 — Company
    await page.getByLabel("Company name").fill(`Test Co ${UNIQUE}`);
    await expect(page.getByLabel("Slug")).toHaveValue(`test-co-${UNIQUE}`);
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("2 of 4")).toBeVisible();

    // Step 2 — Plan (STARTER pre-selected, just proceed)
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("3 of 4")).toBeVisible();

    // Step 3 — Admin
    await page.getByLabel("First name").fill("Sarah");
    await page.getByLabel("Last name").fill("Chen");
    await page.getByLabel("Work email").fill(`sarah-${UNIQUE}@acme.com`);
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("4 of 4")).toBeVisible();

    // Step 4 — Review
    await expect(page.getByText(`Test Co ${UNIQUE}`)).toBeVisible();
    await expect(page.getByText("Starter")).toBeVisible();
    await expect(page.getByText("Sarah Chen")).toBeVisible();
  });

  test("edit link on review navigates to correct step", async ({ page }) => {
    // Quick-fill all steps
    await page.getByLabel("Company name").fill(`Edit Test ${UNIQUE}`);
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByLabel("First name").fill("Alex");
    await page.getByLabel("Last name").fill("Kim");
    await page.getByLabel("Work email").fill(`alex-${UNIQUE}@test.com`);
    await page.getByRole("button", { name: /Next/i }).click();

    // On review — click Edit for Company
    const editButtons = page.getByRole("button", { name: /Edit/i });
    await editButtons.first().click();

    await expect(page.getByText("1 of 4")).toBeVisible();
    await expect(page.getByRole("button", { name: /Save and return to review/i })).toBeVisible();
  });
});
