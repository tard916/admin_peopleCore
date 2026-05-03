"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WizardState } from "./create-tenant-wizard";

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  editingFromReview: boolean;
}

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function StepCompany({ state, onChange, onNext, editingFromReview }: Props) {
  const { name, slug, autoSlug, slugError } = state;
  const [checkingSlug, setCheckingSlug] = useState(false);

  const nameError = !name.trim() ? "Required" : null;
  const slugFormatError =
    slug && !/^[a-z0-9-]+$/.test(slug) ? "Lowercase letters, numbers, and hyphens only" : null;
  const slugRequiredError = !slug.trim() ? "Required" : null;
  const hasError =
    !!nameError || !!slugFormatError || !!slugRequiredError || !!slugError || checkingSlug;

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const patch: Partial<WizardState> = { name: val };
    if (autoSlug) patch.slug = toSlug(val);
    onChange(patch);
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ slug: e.target.value, autoSlug: false, slugError: null });
  }

  async function handleSlugBlur() {
    if (!slug || slugFormatError || slugRequiredError) return;
    setCheckingSlug(true);
    try {
      const res = await fetch(`/api/tenants/check-slug?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (!data.available) {
        onChange({ slugError: "This slug is already taken" });
      } else {
        onChange({ slugError: null });
      }
    } catch {
      // Network error — leave slugError as-is, server will catch on submit
    } finally {
      setCheckingSlug(false);
    }
  }

  function handleNext() {
    if (!hasError) onNext();
  }

  const displaySlugError = slugError ?? slugRequiredError ?? slugFormatError;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-name">Company name</Label>
        <Input
          id="company-name"
          value={name}
          onChange={handleNameChange}
          placeholder="Acme Corp"
          aria-invalid={!!nameError && name.length > 0}
          autoFocus
        />
        {nameError && name.length > 0 && (
          <p className="t-small text-destructive">{nameError}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-slug">Slug</Label>
        <Input
          id="company-slug"
          value={slug}
          onChange={handleSlugChange}
          onBlur={handleSlugBlur}
          placeholder="acme-corp"
          className="font-mono"
          aria-invalid={!!displaySlugError}
        />
        {checkingSlug && (
          <p className="t-small text-muted-foreground">Checking availability…</p>
        )}
        {!checkingSlug && slug && !displaySlugError && (
          <p className="t-small text-muted-foreground">app.peoplecore.io/{slug}</p>
        )}
        {!checkingSlug && displaySlugError && (
          <p className="t-small text-destructive">{displaySlugError}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={hasError}>
          {editingFromReview ? "Save and return to review" : "Next →"}
        </Button>
      </div>
    </div>
  );
}
