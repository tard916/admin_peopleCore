"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  tenantSlug: string;
  adminEmail: string;
  tempPassword: string;
}

export function OnboardingSuccessClient({ tenantSlug, adminEmail, tempPassword }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (val: string, key: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const rows = [
    { key: "slug",  label: "Tenant slug",       value: tenantSlug,    mono: true  },
    { key: "email", label: "Admin email",         value: adminEmail,    mono: false },
    { key: "pass",  label: "Temporary password", value: tempPassword,  mono: true  },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[460px]">
        {/* Success header */}
        <div className="text-center mb-7">
          <div
            className="w-11 h-11 rounded-full inline-flex items-center justify-center mb-3"
            style={{ background: "rgba(0,106,97,0.12)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10L8.5 14.5L16 6" stroke="#006A61" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div
            className="text-[10.5px] font-semibold tracking-[0.07em] uppercase mb-1.5"
            style={{ color: "#006A61" }}
          >
            Tenant created
          </div>
          <h1 className="text-[22px] font-bold text-foreground tracking-[-0.03em]">
            {tenantSlug}
          </h1>
        </div>

        {/* Credentials card */}
        <div className="bg-surface rounded-xl border border-border px-6 mb-2.5">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className="flex items-center justify-between py-3.5"
              style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(19,27,46,0.08)" : "none" }}
            >
              <span
                className="text-[11.5px] text-muted-foreground font-medium uppercase tracking-[0.05em]"
              >
                {row.label}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px] text-foreground cursor-pointer select-all"
                  style={{ fontFamily: row.mono ? '"JetBrains Mono", ui-monospace, monospace' : "inherit", fontWeight: row.mono ? 500 : 400 }}
                  onClick={() => copy(row.value, row.key)}
                >
                  {row.value}
                </span>
                <button
                  onClick={() => copy(row.value, row.key)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 flex leading-none"
                >
                  {copied === row.key ? (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 7L5 10L11 3" stroke="#006A61" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="1.5" y="4" width="7" height="7.5" rx="1" stroke="#6B7190" strokeWidth="1.2" />
                      <path d="M4 4V2.75A1.25 1.25 0 015.25 1.5h5A1.25 1.25 0 0111.5 2.75V8a1.25 1.25 0 01-1.25 1.25H9" stroke="#6B7190" strokeWidth="1.2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div
          className="rounded-md px-4 py-3 flex gap-2.5 mb-2.5"
          style={{
            background: "rgba(180,120,0,0.07)",
            border: "1px solid rgba(180,120,0,0.22)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0 mt-[1px]">
            <path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5z" stroke="#9A6600" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M7.5 6V9" stroke="#9A6600" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="7.5" cy="11" r="0.7" fill="#9A6600" />
          </svg>
          <p className="text-[12.5px] leading-[1.55]" style={{ color: "#7A5000" }}>
            Share via <strong>1Password Send</strong> — not email. The HR admin must change this password on first login.
          </p>
        </div>

        <p className="text-center text-[11.5px] text-muted-foreground mb-4">
          This page cannot be shown again.
        </p>

        <Link
          href="/tenants"
          className="block w-full py-2.5 px-5 rounded-md text-center text-[13px] font-medium text-foreground border border-border bg-surface hover:bg-[#EDEEF5] transition-colors"
        >
          Back to tenants
        </Link>
      </div>
    </div>
  );
}
