import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { createBoxAction } from "../actions";

export const metadata = { title: "Admin · New Cookie Box" };

export default async function NewCookieBoxPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="space-y-8">
      <Link
        href="/admin/cookie-boxes"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All cookie boxes
      </Link>
      <header>
        <h1 className="font-headline text-4xl font-extrabold text-primary md:text-5xl">
          New cookie box
        </h1>
        <p className="mt-2 text-tertiary">
          Create the box first, then add cookies. Link it to a drop when you&rsquo;re ready to sell.
        </p>
      </header>

      {error ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          Name is required.
        </p>
      ) : null}

      <NibbleCard bite="none" className="p-6 md:p-10">
        <form action={createBoxAction} className="space-y-5">
          <Field name="name" label="Box name" placeholder="Mother's Day Box" required />
          <Field name="tagline" label="Short tagline" placeholder="Five cookies that taste like spring." />
          <label className="block">
            <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
              Description
            </span>
            <textarea
              name="description"
              rows={4}
              className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
          </label>
          <Field name="notes" label="Notes (admin-only)" />
          <label className="flex items-center gap-3">
            <input type="checkbox" name="isHidden" className="h-4 w-4 accent-primary" />
            <span>Hidden (won&rsquo;t show in drop picker)</span>
          </label>
          <div className="flex gap-3">
            <BiteButton size="lg">Create box</BiteButton>
            <Link
              href="/admin/cookie-boxes"
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
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
