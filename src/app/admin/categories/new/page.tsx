import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { createCategoryAction } from "../actions";

export const metadata = { title: "Admin · New category" };

const ERRORS: Record<string, string> = {
  name: "Name is required.",
  slug: "A category with that slug already exists.",
};

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="space-y-8">
      <Link
        href="/admin/categories"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All categories
      </Link>
      <header>
        <h1 className="font-headline text-4xl font-extrabold text-primary md:text-5xl">
          New category
        </h1>
      </header>

      {error && ERRORS[error] ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          {ERRORS[error]}
        </p>
      ) : null}

      <NibbleCard bite="none" className="p-6 md:p-10">
        <form action={createCategoryAction} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Name (e.g. Brownies)" required />
            <Field name="slug" label="Slug (auto from name if blank)" />
          </div>
          <Field name="description" label="Description (optional)" />
          <Field name="sortOrder" type="number" label="Sort order (lower = earlier in pickers)" defaultValue="0" />
          <Toggle name="isActive" label="Active" defaultChecked />
          <div className="flex gap-3">
            <BiteButton size="lg">Create category</BiteButton>
            <Link
              href="/admin/categories"
              className="self-center font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
            >
              Cancel
            </Link>
          </div>
        </form>
      </NibbleCard>
    </div>
  );
}

function Field({
  name, label, type = "text", required, defaultValue,
}: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-primary" />
      <span>{label}</span>
    </label>
  );
}
