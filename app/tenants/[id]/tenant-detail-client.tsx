"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PlanBadge, StatusBadge, SlugChip } from "@/components/pc-badge";
import {
  editTenantAction,
  suspendTenantAction,
  reactivateTenantAction,
  deleteTenantAction,
} from "./actions";

function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  employeeCount: number;
  hrAdmins: number;
  createdAt: string;
  adminEmail: string;
}

function Dialog({
  open,
  onClose,
  title,
  width = 400,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(19,27,46,0.35)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-surface rounded-xl p-6"
        style={{ width, maxWidth: "100%", boxShadow: "0 8px 40px rgba(19,27,46,0.18)" }}
      >
        {title && <h3 className="t-heading mb-3">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-md t-ui outline-none border transition-all bg-muted border-transparent focus:bg-white focus:border-primary";

export function TenantDetailClient({ tenant: initial }: { tenant: Tenant }) {
  const [tenant, setTenant] = useState(initial);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: tenant.name, plan: tenant.plan });
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const boundEdit = editTenantAction.bind(null, tenant.id);
  const [editState, editDispatch] = useActionState(boundEdit, undefined);

  function handleSuspendConfirm() {
    startTransition(async () => {
      try {
        if (tenant.status === "ACTIVE") {
          await suspendTenantAction(tenant.id);
          setTenant((t) => ({ ...t, status: "SUSPENDED" }));
          toast.success("Tenant suspended");
        } else {
          await reactivateTenantAction(tenant.id);
          setTenant((t) => ({ ...t, status: "ACTIVE" }));
          toast.success("Tenant reactivated");
        }
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
      setShowSuspend(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteTenantAction(tenant.id);
      } catch {
        toast.error("Failed to delete tenant.");
      }
    });
  }

  const hasAdmin = tenant.hrAdmins > 0;

  return (
    <>
      <main className="mx-auto w-full max-w-[820px] px-6 py-6 flex-1">
        <Link
          href="/tenants"
          className="inline-flex items-center gap-1 t-small mb-5 hover:text-foreground transition-colors"
        >
          ← Tenants
        </Link>

        {/* Header card */}
        <div className="bg-surface rounded-xl border border-border p-5 mb-2.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="t-page-title mb-2">{tenant.name}</h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <SlugChip value={tenant.slug} />
                <PlanBadge value={tenant.plan} />
                <StatusBadge value={tenant.status} />
                <span className="t-small">Created {fmtDate(tenant.createdAt)}</span>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => { setEditForm({ name: tenant.name, plan: tenant.plan }); setShowEdit(true); }}
                className="px-3 py-1.5 text-xs rounded-md border border-border bg-surface text-foreground font-medium hover:bg-muted transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setShowSuspend(true)}
                disabled={isPending}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors disabled:opacity-50 ${
                  tenant.status === "ACTIVE"
                    ? "border text-destructive hover:bg-destructive/5"
                    : "border border-border bg-surface text-foreground hover:bg-muted"
                }`}
                style={tenant.status === "ACTIVE" ? { borderColor: "rgba(178,30,30,0.35)" } : {}}
              >
                {tenant.status === "ACTIVE" ? "Suspend" : "Reactivate"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-surface rounded-xl border border-border mb-2.5 grid grid-cols-3">
          {[
            { label: "Employees",    value: tenant.employeeCount.toLocaleString() },
            { label: "HR / Admins",  value: String(tenant.hrAdmins) },
            { label: "Member since", value: fmtDate(tenant.createdAt) },
          ].map((s, i) => (
            <div
              key={i}
              className="px-5 py-4"
              style={{ borderRight: i < 2 ? "1px solid rgba(19,27,46,0.08)" : "none" }}
            >
              <div className="eyebrow mb-1.5">{s.label}</div>
              <div className="t-stat">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Impersonate */}
        <div className="mb-4">
          {hasAdmin ? (
            <Link
              href={`/impersonate/${tenant.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-border bg-surface text-foreground font-medium hover:bg-muted transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M1.5 11.5c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Log in as tenant
            </Link>
          ) : (
            <div className="relative inline-flex group">
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-border bg-surface text-foreground opacity-45 cursor-not-allowed font-medium"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M1.5 11.5c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Log in as tenant
              </button>
              <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-foreground text-white text-xs px-2.5 py-1 rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                No active admin user
              </div>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="bg-surface rounded-xl border border-border mb-4">
          <div className="px-5 border-b border-border">
            <button
              className="py-3 t-ui font-medium text-primary border-b-2 border-primary"
              style={{ marginBottom: "-1px" }}
            >
              Members
            </button>
          </div>
          <div className="px-5 pt-3 pb-4">
            <p className="t-small mb-2">Member management is read-only in v1.</p>
            <p className="t-body-muted italic">
              {tenant.employeeCount === 0
                ? "No members yet."
                : `${tenant.employeeCount} member(s)${tenant.adminEmail ? ` · Primary admin: ${tenant.adminEmail}` : ""}`}
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div
          className="rounded-xl p-5 px-6"
          style={{ border: "1px solid rgba(178,30,30,0.22)", background: "rgba(178,30,30,0.025)" }}
        >
          <div className="eyebrow text-destructive mb-1.5">Danger zone</div>
          <p className="t-body-muted mb-4">
            Soft-delete this tenant. Data is retained for 90 days and can be recovered on request.
          </p>
          {!deleteMode ? (
            <button
              onClick={() => setDeleteMode(true)}
              className="px-3 py-1.5 text-xs rounded-md font-medium text-destructive border transition-colors hover:bg-destructive/5"
              style={{ borderColor: "rgba(178,30,30,0.35)" }}
            >
              Delete tenant…
            </button>
          ) : (
            <div>
              <p className="t-body mb-2.5">
                Type <strong className="t-mono">{tenant.slug}</strong> to confirm.
              </p>
              <div className="flex gap-2 items-center">
                <input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={tenant.slug}
                  className="px-3 py-1.5 rounded-md t-mono outline-none border border-transparent bg-muted focus:bg-white focus:border-primary transition-all max-w-[220px]"
                />
                <button
                  disabled={deleteInput !== tenant.slug || isPending}
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-xs rounded-md font-medium text-white bg-destructive disabled:opacity-40 hover:bg-[#8f1818] transition-colors"
                >
                  {isPending ? "Deleting…" : "Confirm delete"}
                </button>
                <button
                  onClick={() => { setDeleteMode(false); setDeleteInput(""); }}
                  className="px-3 py-1.5 text-xs rounded-md font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Suspend/Reactivate Dialog */}
      <Dialog
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
        title={tenant.status === "ACTIVE" ? `Suspend ${tenant.name}?` : `Reactivate ${tenant.name}?`}
      >
        <p className="t-body-muted mb-5">
          {tenant.status === "ACTIVE"
            ? "Active users will be locked out on their next session refresh. This can be reversed at any time."
            : "This will restore access for all users. They'll be able to sign in immediately."}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowSuspend(false)}
            className="px-3 py-2 text-sm rounded-md border border-border bg-surface text-foreground font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSuspendConfirm}
            disabled={isPending}
            className={`px-3 py-2 text-sm rounded-md font-medium text-white transition-colors disabled:opacity-50 ${
              tenant.status === "ACTIVE" ? "bg-destructive hover:bg-[#8f1818]" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isPending ? "…" : tenant.status === "ACTIVE" ? "Suspend" : "Reactivate"}
          </button>
        </div>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title="Edit tenant" width={380}>
        <form
          action={(fd) => {
            editDispatch(fd);
            setTenant((t) => ({ ...t, name: fd.get("name") as string, plan: fd.get("plan") as string }));
            setShowEdit(false);
            toast.success("Tenant updated");
          }}
        >
          <div className="flex flex-col gap-3.5 mb-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">Company name</label>
              <input
                name="name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
              />
              {editState?.errors?.name && (
                <p className="t-small text-destructive">{editState.errors.name}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">Plan</label>
              <select
                name="plan"
                value={editForm.plan}
                onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
                className={inputCls}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236B7190' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  paddingRight: "2rem",
                  appearance: "none",
                }}
              >
                {["FREE", "STARTER", "GROWTH", "ENTERPRISE"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          {editState?.error && (
            <p className="t-small text-destructive mb-3">{editState.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="px-3 py-2 text-sm rounded-md border border-border bg-surface text-foreground font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 text-sm rounded-md font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              Save changes
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
