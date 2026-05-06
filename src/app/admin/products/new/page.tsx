import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { CategoryTypeahead } from "@/components/ui/category-typeahead";
import { listCategories } from "@/lib/products";
import { createProductAction } from "../actions";

export const metadata = { title: "Admin · New product" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  name: "Name is required.",
  slug: "A product with that URL slug already exists.",
  category: "Pick a category from the list (or create one first).",
};

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const categories = await listCategories();

  return (
    <div className="space-y-8">
      <Link
        href="/admin/products"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All products
      </Link>
      <header>
        <h1 className="font-headline text-4xl font-extrabold text-primary md:text-5xl">
          New product
        </h1>
        <p className="mt-2 text-tertiary">
          Create the catalog entry. You can add additional variants and images
          after saving.
        </p>
      </header>

      {error && ERRORS[error] ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          {ERRORS[error]}
        </p>
      ) : null}

      <NibbleCard bite="none" className="p-6 md:p-10">
        <form action={createProductAction} encType="multipart/form-data" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Name" required />
            <Field name="slug" label="URL slug (auto from name if blank)" />
          </div>
          <Field name="shortDescription" label="Short description (one-liner shown on cards)" />
          <TextArea name="description" label="Full description (shown on the product page)" rows={4} />
          <div className="grid gap-4 md:grid-cols-3">
            <CategoryTypeahead categories={categories} required />
            <Field name="sortOrder" type="number" label="Sort order (lower = earlier)" defaultValue="0" />
            <Field name="ingredientChips" label="Chip callouts (comma-separated)" placeholder="Bestseller, Gluten-Free" />
          </div>
          <div className="flex flex-wrap gap-4">
            <Toggle name="isAvailable" label="Available on /shop" defaultChecked />
            <Toggle name="isFeatured" label="Show on homepage as featured" />
          </div>
          <FileField name="image" label="Primary image (optional, ≤ 8MB) — gallery extras can be added after saving" />

          <fieldset className="rounded-md bg-surface-container-low p-4">
            <legend className="px-2 font-label uppercase tracking-[0.12em] text-on-surface-variant">
              First variant (you can add more after saving)
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="variantLabel" label="Variant label (e.g. Dozen, 9-inch)" />
              <Field name="variantPriceUsd" type="number" label="Price ($)" placeholder="24.00" />
            </div>
          </fieldset>

          <div className="flex gap-3">
            <BiteButton size="lg">Create product</BiteButton>
            <Link
              href="/admin/products"
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
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  const isMoney = name.endsWith("Usd");
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={isMoney ? "0.01" : undefined}
        min={isMoney ? 0 : undefined}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
function TextArea({ name, label, rows = 3, defaultValue }: {
  name: string; label: string; rows?: number; defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
      <textarea name={name} rows={rows} defaultValue={defaultValue}
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
function FileField({ name, label }: { name: string; label: string }) {
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
      <input
        name={name}
        type="file"
        accept="image/*"
        className="mt-2 block w-full font-body text-sm text-on-surface file:mr-3 file:rounded-md file:border-0 file:bg-secondary-container file:px-4 file:py-2 file:font-headline file:font-bold file:text-on-secondary-container hover:file:bg-secondary-fixed"
      />
    </label>
  );
}
