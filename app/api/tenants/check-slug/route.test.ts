import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth guard — most tests run as authenticated admin
vi.mock("@/lib/super-admin", () => ({
  currentSuperAdmin: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@224tech.com" }),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    tenant: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

const mockFindFirst = vi.mocked(prisma.tenant.findFirst);

function makeRequest(slug?: string) {
  const url = slug
    ? `http://localhost/api/tenants/check-slug?slug=${encodeURIComponent(slug)}`
    : "http://localhost/api/tenants/check-slug";
  return new NextRequest(url);
}

describe("GET /api/tenants/check-slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { available: true } when slug is not in DB", async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await GET(makeRequest("acme-corp"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ available: true });
  });

  it("returns { available: false } when slug exists in DB", async () => {
    mockFindFirst.mockResolvedValue({ id: "ten_123" } as never);
    const res = await GET(makeRequest("taken-slug"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ available: false });
  });

  it("returns 400 when slug param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 400 when slug param is empty string", async () => {
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("queries prisma with the exact slug value", async () => {
    mockFindFirst.mockResolvedValue(null);
    await GET(makeRequest("my-slug"));
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { slug: "my-slug" },
      select: { id: true },
    });
  });
});
