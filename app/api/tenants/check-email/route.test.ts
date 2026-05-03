import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/super-admin", () => ({
  currentSuperAdmin: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@224tech.com" }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

const mockFindFirst = vi.mocked(prisma.user.findFirst);

function makeRequest(email?: string) {
  const url = email
    ? `http://localhost/api/tenants/check-email?email=${encodeURIComponent(email)}`
    : "http://localhost/api/tenants/check-email";
  return new NextRequest(url);
}

describe("GET /api/tenants/check-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { available: true } when email is not registered", async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await GET(makeRequest("new@acme.com"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ available: true });
  });

  it("returns { available: false } when email exists (case-insensitive match)", async () => {
    // Even though we query with mode: insensitive, the mock just returns a value
    mockFindFirst.mockResolvedValue({ id: "usr_123" } as never);
    const res = await GET(makeRequest("ADMIN@example.com"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ available: false });
  });

  it("uses case-insensitive mode in the prisma query", async () => {
    mockFindFirst.mockResolvedValue(null);
    await GET(makeRequest("test@acme.com"));
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { email: { equals: "test@acme.com", mode: "insensitive" } },
      select: { id: true },
    });
  });

  it("returns 400 when email param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 400 when email param is empty string", async () => {
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });
});
