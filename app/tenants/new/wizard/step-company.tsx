"use client";

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

  const nameError = !name.trim() ? "Required" : null;
  const slugFormatError =
    slug && !/^[a-z0-9-]+$/.test(slug) ? "Lowercase letters, numbers, and hyphens only" : null;
  const slugRequiredError = !slug.trim() ? "Required" : null;
  const hasError = !!nameError || !!slugFormatError || !!slugRequiredError || !!slugError;

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const patch: Partial<WizardState> = { name: val };
    if (autoSlug) patch.slug = toSlug(val);
    onChange(patch);
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ slug: e.target.value, autoSlug: false, slugError: null });
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
          placeholder="acme-corp"
          className="font-mono"
          aria-invalid={!!displaySlugError}
        />
        {slug && !displaySlugError && (
          <p className="t-small text-muted-foreground">app.peoplecore.io/{slug}</p>
        )}
        {displaySlugError && (
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
