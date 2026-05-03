"use client";

import { useActionState, useState } from "react";
import { createTenantAction, type CreateTenantState } from "./actions";

const chevron = `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236B7190' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow mb-4">{children}</div>;
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint && !error && <span className="t-small">{hint}</span>}
      {error && <span className="t-small text-destructive">{error}</span>}
    </div>
  );
}

const inputCls = (error?: string) =>
  `w-full px-3 py-2 rounded-md t-ui outline-none border transition-all bg-muted border-transparent focus:bg-white focus:border-primary${error ? " !border-destructive" : ""}`;

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CreateTenantForm() {
  const [state, action, isPending] = useActionState<CreateTenantState, FormData>(
    createTenantAction,
    undefined,
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (autoSlug) setSlug(toSlug(val));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false);
    setSlug(e.target.value);
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 t-ui text-destructive">
          {state.error}
        </div>
      )}

      {/* Company section */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <SectionHeader>Company</SectionHeader>
        <div className="flex flex-col gap-3.5">
          <Field label="Company name" error={state?.errors?.name}>
            <input
              name="name"
              value={name}
              onChange={handleNameChange}
              placeholder="Acme Corp"
              className={inputCls(state?.errors?.name)}
              required
            />
          </Field>
          <Field
            label="Slug"
            error={state?.errors?.slug}
            hint={slug ? `app.peoplecore.io/${slug}` : "Auto-generated from company name"}
          >
            <input
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="acme-corp"
              className={`${inputCls(state?.errors?.slug)} font-mono`}
              required
            />
          </Field>
          <Field label="Plan" error={state?.errors?.plan}>
            <select
              name="plan"
              defaultValue="STARTER"
              className={inputCls()}
              style={{
                backgroundImage: chevron,
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
          </Field>
        </div>
      </div>

      {/* Admin section */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <SectionHeader>First HR Admin</SectionHeader>
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={state?.errors?.firstName}>
              <input name="firstName" placeholder="Sarah" className={inputCls(state?.errors?.firstName)} required />
            </Field>
            <Field label="Last name" error={state?.errors?.lastName}>
              <input name="lastName" placeholder="Chen" className={inputCls(state?.errors?.lastName)} required />
            </Field>
          </div>
          <Field label="Work email" error={state?.errors?.email}>
            <input
              name="email"
              type="email"
              placeholder="sarah@acme.com"
              className={inputCls(state?.errors?.email)}
              required
            />
          </Field>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        {isPending ? "Creating tenant…" : "Create tenant"}
      </button>
    </form>
  );
}
