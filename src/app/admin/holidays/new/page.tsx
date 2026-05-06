import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { createHolidayAction } from "../actions";

export const metadata = { title: "Admin · New holiday" };

export default async function NewHolidayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="space-y-8">
      <Link
        href="/admin/holidays"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All holidays
      </Link>
      <header>
        <h1 className="font-headline text-4xl font-extrabold text-primary md:text-5xl">
          New holiday
        </h1>
      </header>

      {error ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          Name and date are both required.
        </p>
      ) : null}

      <NibbleCard bite="none" className="p-6 md:p-10">
        <form action={createHolidayAction} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Name" placeholder="e.g. Mother's Day" required />
            <Field name="date" type="date" label="Date" required />
          </div>
          <Field name="notes" label="Notes (optional, admin-only)" />
          <div className="flex flex-wrap gap-4">
            <Toggle name="isRecurring" label="Recurring (re-seeds yearly)" defaultChecked />
            <Toggle name="isHidden" label="Hidden (won't show in pickers)" />
          </div>
          <div className="flex gap-3">
            <BiteButton size="lg">Create holiday</BiteButton>
            <Link
              href="/admin/holidays"
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
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-primary" />
      <span>{label}</span>
    </label>
  );
}
