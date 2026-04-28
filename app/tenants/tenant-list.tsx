"use client";

import { useState } from "react";
import Link from "next/link";
import { PlanBadge, StatusBadge, SlugChip } from "@/components/pc-badge";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  employeeCount: number;
  createdAt: string;
}

function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const PER = 20;

export function TenantList({ tenants }: { tenants: Tenant[] }) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    return (
      (!q || t.name.toLowerCase().includes(q) || t.slug.includes(q))
      && (!planFilter || t.plan === planFilter)
      && (!statusFilter || t.status === statusFilter)
    );
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageData = filtered.slice((page - 1) * PER, page * PER);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handlePlanChange = (v: string) => { setPlanFilter(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };

  return (
    <div>
      {/* Filters */}
      <div className="flex items-baseline gap-2.5 mb-4">
        <h1 className="text-[18px] font-bold text-foreground tracking-[-0.03em]">Tenants</h1>
        <span className="text-[12px] text-muted-foreground">{filtered.length} results</span>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="#6B7190" strokeWidth="1.4" />
            <path d="M9 9L11.5 11.5" stroke="#6B7190" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            className="w-full pl-8 pr-3 py-2 bg-[#EDEEF5] border border-transparent rounded-md text-[13px] text-foreground outline-none focus:bg-white focus:border-primary transition-all"
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <select
          className="w-[148px] px-3 py-2 bg-[#EDEEF5] border border-transparent rounded-md text-[13px] text-foreground outline-none focus:bg-white focus:border-primary appearance-none transition-all cursor-pointer"
          value={planFilter}
          onChange={(e) => handlePlanChange(e.target.value)}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236B7190' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
        >
          <option value="">All plans</option>
          {["FREE", "STARTER", "GROWTH", "ENTERPRISE"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          className="w-[148px] px-3 py-2 bg-[#EDEEF5] border border-transparent rounded-md text-[13px] text-foreground outline-none focus:bg-white focus:border-primary appearance-none transition-all cursor-pointer"
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236B7190' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {pageData.length === 0 ? (
          <div className="py-[72px] px-6 text-center">
            <div className="text-[28px] text-border mb-3 font-light">—</div>
            <div className="text-[14px] font-medium text-foreground mb-1">No tenants found</div>
            <div className="text-[13px] text-muted-foreground">Try adjusting your search or filters</div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Name", "Slug", "Plan", "Status", "Employees", "Created"].map((h, i) => (
                  <th
                    key={h}
                    className="px-3.5 py-2 text-[10.5px] font-semibold text-muted-foreground tracking-[0.05em] uppercase border-b border-border whitespace-nowrap"
                    style={{ textAlign: h === "Employees" ? "right" : "left" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((t) => (
                <Link key={t.id} href={`/tenants/${t.id}`} legacyBehavior>
                  <tr className="cursor-pointer hover:bg-[rgba(237,238,245,0.6)] transition-colors">
                    <td className="px-3.5 py-2.5 text-[13px] border-b border-border">
                      <span className="font-medium text-foreground">{t.name}</span>
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-border">
                      <SlugChip value={t.slug} />
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-border">
                      <PlanBadge value={t.plan} />
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-border">
                      <StatusBadge value={t.status} />
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-border text-right text-[13px] text-muted-foreground tabular-nums">
                      {t.employeeCount.toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-border text-[13px] text-muted-foreground">
                      {fmtDate(t.createdAt)}
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
            <span className="text-[11.5px] text-muted-foreground">
              {(page - 1) * PER + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-[12px] rounded-md border border-border bg-surface text-foreground disabled:opacity-40 hover:bg-[#EDEEF5] transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1 text-[12px] rounded-md transition-colors ${
                    n === page
                      ? "bg-primary text-white border border-primary"
                      : "border border-border bg-surface text-foreground hover:bg-[#EDEEF5]"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-[12px] rounded-md border border-border bg-surface text-foreground disabled:opacity-40 hover:bg-[#EDEEF5] transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
