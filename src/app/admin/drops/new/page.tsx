import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { createDropAction } from "../actions";

export const metadata = { title: "Admin · New drop" };
export const dynamic = "force-dynamic";

export default async function NewDropPage() {
  const [holidays, products] = await Promise.all([
    db.query.holidays.findMany({
      orderBy: (t, { asc }) => [asc(t.date)],
    }),
    db.query.products.findMany({
      where: (t, { eq }) => eq(t.isAvailable, true),
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/drops"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All drops
      </Link>
      <header>
        <h1 className="font-headline text-4xl font-extrabold text-primary md:text-5xl">
          New drop
        </h1>
        <p className="mt-2 text-tertiary">
          Build a holiday box: pick the cookies, set the open/close dates, choose
          inventory.
        </p>
      </header>

      <NibbleCard bite="none" className="p-6 md:p-10">
        <form action={createDropAction} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Drop name" placeholder="Mother's Day Garden Box" required />
            <Field name="slug" label="URL slug" placeholder="mothers-day-2026" required />
          </div>
          <Field name="tagline" label="Short tagline" placeholder="Five cookies that taste like spring." />
          <label className="block">
            <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">Description</span>
            <textarea
              name="description"
              rows={4}
              className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">Holiday (optional)</span>
              <select
                name="holidayId"
                className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body"
                defaultValue=""
              >
                <option value="">— None —</option>
                {holidays.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} · {h.date}
                  </option>
                ))}
              </select>
            </label>
            <Field
              name="assortedBoxPriceUsd"
              type="number"
              label="Assorted box price ($)"
              placeholder="48.00"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="opensAt" type="datetime-local" label="Opens at" required />
            <Field name="closesAt" type="datetime-local" label="Closes at" required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="fulfillmentStart" type="date" label="Fulfillment window starts" required />
            <Field name="fulfillmentEnd" type="date" label="Fulfillment window ends" required />
          </div>

          <Field
            name="assortedBoxInventory"
            type="number"
            label="Box inventory (leave blank for unlimited)"
          />

          <fieldset>
            <legend className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
              Cookies in this box (3–5 recommended)
            </legend>
            <p className="mt-1 text-xs text-on-surface-variant">
              Pick which cookies are in the assorted box AND can be bought by-the-dozen from this drop.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {products.map((p) => (
                <label key={p.id} className="flex items-start gap-3 rounded-md bg-surface-container-high p-3">
                  <input
                    type="checkbox"
                    name="dropItemProductIds"
                    value={p.id}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-on-surface">{p.name}</p>
                    {p.shortDescription ? (
                      <p className="text-xs text-on-surface-variant">{p.shortDescription}</p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
            <Field
              name="defaultDozenPriceUsd"
              type="number"
              label="Default dozen price for each ($)"
              placeholder="24.00"
            />
          </fieldset>

          <label className="flex items-center gap-3">
            <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4 accent-primary" />
            <span>Publish immediately</span>
          </label>

          <div className="flex gap-3">
            <BiteButton size="lg">Create drop</BiteButton>
            <Link href="/admin/drops" className="self-center font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary">
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
  // Money fields use 2-decimal precision so admins type "48.00" not "4800".
  const isMoney = name.endsWith("Usd");
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={isMoney ? "0.01" : undefined}
        min={isMoney ? 0 : undefined}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
