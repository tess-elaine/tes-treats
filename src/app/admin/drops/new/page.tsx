import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { createDropAction } from "../actions";

export const metadata = { title: "Admin · New drop" };
export const dynamic = "force-dynamic";

export default async function NewDropPage() {
  const boxes = await db.query.cookieBoxes.findMany({
    where: (t, { eq }) => eq(t.isHidden, false),
    orderBy: (t, { asc }) => [asc(t.name)],
    with: { items: { with: { product: true }, orderBy: (t, { asc }) => [asc(t.sortOrder)] } },
  });

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
          Pick a cookie box, set the dates and pricing. Cookies are inherited from the box.
        </p>
      </header>

      <NibbleCard bite="none" className="p-6 md:p-10">
        <form action={createDropAction} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Drop name" placeholder="Mother's Day 2026" required />
            <Field name="slug" label="URL slug" placeholder="mothers-day-2026" required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                Cookie box
              </span>
              <select
                name="cookieBoxId"
                className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body"
                defaultValue=""
              >
                <option value="">— None (add cookies manually after) —</option>
                {boxes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.items.length > 0
                      ? ` · ${b.items.map((i) => i.product.name).join(", ")}`
                      : " · no cookies yet"}
                  </option>
                ))}
              </select>
              {boxes.length === 0 ? (
                <p className="mt-1 text-xs text-on-surface-variant">
                  No boxes yet.{" "}
                  <Link href="/admin/cookie-boxes/new" className="text-primary underline">
                    Create one first.
                  </Link>
                </p>
              ) : null}
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

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="assortedBoxInventory"
              type="number"
              label="Box inventory (blank = unlimited)"
            />
            <Field
              name="defaultDozenPriceUsd"
              type="number"
              label="Default dozen price for each cookie ($)"
              placeholder="24.00"
            />
          </div>

          <label className="flex items-center gap-3">
            <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4 accent-primary" />
            <span>Publish immediately</span>
          </label>

          <div className="flex gap-3">
            <BiteButton size="lg">Create drop</BiteButton>
            <Link
              href="/admin/drops"
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
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={isMoney ? "0.01" : undefined}
        min={isMoney ? 0 : undefined}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
