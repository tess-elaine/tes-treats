import Link from "next/link";
import { notFound } from "next/navigation";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { db } from "@/db";
import { updateHolidayAction, deleteHolidayAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminHolidayDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const holiday = await db.query.holidays.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!holiday) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/admin/holidays"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All holidays
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Holiday
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
            {holiday.name}
          </h1>
        </div>
        <form action={deleteHolidayAction}>
          <input type="hidden" name="id" value={holiday.id} />
          <ConfirmSubmit
            message={`Delete "${holiday.name}" permanently?`}
            className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
          >
            Delete holiday
          </ConfirmSubmit>
        </form>
      </header>

      <NibbleCard bite="none" className="p-6 md:p-10">
        <form action={updateHolidayAction} className="space-y-5">
          <input type="hidden" name="id" value={holiday.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Name" defaultValue={holiday.name} required />
            <Field name="date" type="date" label="Date" defaultValue={holiday.date} required />
          </div>
          <Field name="notes" label="Notes" defaultValue={holiday.notes ?? ""} />
          <div className="flex flex-wrap gap-4">
            <Toggle name="isRecurring" label="Recurring" defaultChecked={holiday.isRecurring} />
            <Toggle name="isHidden" label="Hidden" defaultChecked={holiday.isHidden} />
          </div>
          <BiteButton size="lg">Save changes</BiteButton>
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
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
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
