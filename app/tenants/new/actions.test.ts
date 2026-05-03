import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/super-admin", () => ({
  currentSuperAdmin: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@224tech.com" }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tenant: { create: vi.fn() },
  },
}));

vi.mock("@/lib/session", () => ({
  getFlashSession: vi.fn().mockResolvedValue({
    tempPassword: undefined,
    tenantSlug: undefined,
    adminEmail: undefined,
    save: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-pw") },
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("abc12345"),
}));

import { createTenantAction, type CreateTenantInput } from "./actions";
import { prisma } from "@/lib/db";
import { getFlashSession } from "@/lib/session";

const mockCreate = vi.mocked(prisma.tenant.create);

const validInput: CreateTenantInput = {
  name: "Acme Corp",
  slug: "acme-corp",
  plan: "STARTER",
  firstName: "Sarah",
  lastName: "Chen",
  email: "sarah@acme.com",
};

describe("createTenantAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset flash session mock
    vi.mocked(getFlashSession).mockResolvedValue({
      tempPassword: undefined,
      tenantSlug: undefined,
      adminEmail: undefined,
      save: vi.fn().mockResolvedValue(undefined),
    } as never);
  });

  it("returns { ok: true } and writes flash session on success", async () => {
    mockCreate.mockResolvedValue({ id: "ten_abc12345", slug: "acme-corp" } as never);

    const result = await createTenantAction(validInput);

    expect(result).toEqual({ ok: true });

    // Flash session written with expected keys
    const session = await getFlashSession();
    expect(session.tenantSlug).toBe("acme-corp");
    expect(session.adminEmail).toBe("sarah@acme.com");
    expect(typeof session.tempPassword).toBe("string");
  });

  it("does not call redirect()", async () => {
    // redirect is not imported — if it were called, it would throw NEXT_REDIRECT
    // which would bubble as an unhandled error. This test verifies it doesn't throw.
    mockCreate.mockResolvedValue({ id: "ten_abc12345", slug: "acme-corp" } as never);
    await expect(createTenantAction(validInput)).resolves.toEqual({ ok: true });
  });

  it("returns { errors: { slug } } on duplicate slug", async () => {
    mockCreate.mockRejectedValue(
      new Error("Unique constraint failed on the fields: (`slug`)")
    );
    const result = await createTenantAction(validInput);
    expect(result).toEqual({ errors: { slug: "This slug is already taken" } });
  });

  it("returns { errors: { email } } on duplicate email", async () => {
    mockCreate.mockRejectedValue(
      new Error("Unique constraint failed on the fields: (`email`)")
    );
    const result = await createTenantAction(validInput);
    expect(result).toEqual({ errors: { email: "This email is already registered" } });
  });

  it("returns { error } on unexpected DB failure", async () => {
    mockCreate.mockRejectedValue(new Error("Connection timeout"));
    const result = await createTenantAction(validInput);
    expect(result).toHaveProperty("error");
  });

  it("returns { errors } on invalid plan value", async () => {
    const result = await createTenantAction({
      ...validInput,
      plan: "INVALID" as never,
    });
    expect(result).toHaveProperty("errors");
  });

  it("returns { errors } when name is empty", async () => {
    const result = await createTenantAction({ ...validInput, name: "" });
    expect(result).toHaveProperty("errors");
  });

  it("returns { errors } when email is invalid", async () => {
    const result = await createTenantAction({ ...validInput, email: "not-an-email" });
    expect(result).toHaveProperty("errors");
  });
});
