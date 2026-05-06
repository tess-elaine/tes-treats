import Link from "next/link";
import { notFound } from "next/navigation";
import { count, isNull } from "drizzle-orm";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { dropSubscribers } from "@/db/schema/drops";
import { formatCents, formatDate } from "@/lib/format";
import {
  updateDropAction,
  addDropItemAction,
  updateDropItemAction,
  deleteDropItemAction,
  sendDropAnnouncementAction,
} from "../actions";

export const dynamic = "force-dynamic";

function toLocalIso(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default async function AdminDropDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ announced?: string; error?: string }>;
}) {
  const { id } = await params;
  const { announced, error } = await searchParams;

  const drop = await db.query.drops.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!drop) notFound();

  const [holidays, items, allCookies, subscriberCountRow] = await Promise.all([
    db.query.holidays.findMany({ orderBy: (t, { asc }) => [asc(t.date)] }),
    db.query.dropItems.findMany({
      where: (t, { eq }) => eq(t.dropId, drop.id),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    }),
    db.query.products.findMany({
      where: (t, { eq }) => eq(t.isAvailable, true),
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
    db
      .select({ c: count() })
      .from(dropSubscribers)
      .where(isNull(dropSubscribers.unsubscribedAt))
      .then((r) => r[0]?.c ?? 0),
  ]);
  const productIds = items.map((i) => i.productId);
  const usedMap = new Map(productIds.map((p) => [p, true]));
  const remainingCookies = allCookies.filter((p) => !usedMap.has(p.id));
  const productById = new Map(allCookies.map((p) => [p.id, p]));

  return (
    <div className="space-y-8">
      <Link
        href="/admin/drops"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All drops
      </Link>
      <header>
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Drop · {drop.isPublished ? "published" : "draft"}
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          {drop.name}
        </h1>
      </header>

      {announced ? (
        <p className="rounded-md bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
          Announcement sent to {announced} {Number(announced) === 1 ? "subscriber" : "subscribers"}.
        </p>
      ) : null}
      {error === "already-sent" ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          An announcement was already sent for this drop. Tick &ldquo;Send anyway&rdquo; to resend.
        </p>
      ) : null}

      <NibbleCard bite="none" className="p-6 md:p-10">
        <h2 className="font-headline text-xl font-bold text-primary">Drop details</h2>
        <form action={updateDropAction} className="mt-4 space-y-6">
          <input type="hidden" name="id" value={drop.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Drop name" defaultValue={drop.name} required />
            <Field name="slug" label="URL slug" defaultValue={drop.slug} required />
          </div>
          <Field name="tagline" label="Tagline" defaultValue={drop.tagline ?? ""} />
          <label className="block">
            <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">Description</span>
            <textarea
              name="description"
              rows={4}
              defaultValue={drop.description ?? ""}
              className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">Holiday</span>
              <select
                name="holidayId"
                defaultValue={drop.holidayId ?? ""}
                className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body"
              >
                <option value="">— None —</option>
                {holidays.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} · {h.date}</option>
                ))}
              </select>
            </label>
            <Field
              name="assortedBoxPriceUsd"
              type="number"
              label="Assorted box price ($)"
              defaultValue={
                drop.assortedBoxPriceCents != null
                  ? (drop.assortedBoxPriceCents / 100).toFixed(2)
                  : ""
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="opensAt" type="datetime-local" label="Opens at" defaultValue={toLocalIso(drop.opensAt)} required />
            <Field name="closesAt" type="datetime-local" label="Closes at" defaultValue={toLocalIso(drop.closesAt)} required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="fulfillmentStart" type="date" label="Fulfillment starts" defaultValue={String(drop.fulfillmentStart)} required />
            <Field name="fulfillmentEnd" type="date" label="Fulfillment ends" defaultValue={String(drop.fulfillmentEnd)} required />
          </div>

          <Field
            name="assortedBoxInventory"
            type="number"
            label="Box inventory (blank = unlimited)"
            defaultValue={String(drop.assortedBoxInventory ?? "")}
          />
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={drop.isPublished}
              className="h-4 w-4 accent-primary"
            />
            <span>Published</span>
          </label>

          <BiteButton size="lg">Save changes</BiteButton>
        </form>
      </NibbleCard>

      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-headline text-xl font-bold text-primary">
            Cookies in this drop
          </h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            {items.length} {items.length === 1 ? "cookie" : "cookies"}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((it) => {
            const p = productById.get(it.productId);
            return (
              <form
                key={it.id}
                action={updateDropItemAction}
                className="grid items-end gap-3 rounded-md bg-surface-container-low p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]"
              >
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="dropId" value={drop.id} />
                <div>
                  <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">Cookie</p>
                  <p className="mt-1 font-medium text-on-surface">{p?.name ?? "Unknown"}</p>
                </div>
                <Field name="dozenPriceUsd" type="number" label="Dozen ($)" defaultValue={(it.dozenPriceCents / 100).toFixed(2)} />
                <Field name="dozenInventory" type="number" label="Inventory" defaultValue={String(it.dozenInventory ?? "")} />
                <Field name="sortOrder" type="number" label="Sort" defaultValue={String(it.sortOrder)} />
                <button type="submit" className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline">
                  Save
                </button>
                <DeleteForm idValue={it.id} dropId={drop.id} />
                <p className="sm:col-span-6 text-xs text-on-surface-variant">
                  Sold so far: {it.dozenSold}
                  {it.dozenInventory != null ? ` / ${it.dozenInventory}` : " (unlimited)"}
                </p>
              </form>
            );
          })}

          {remainingCookies.length > 0 ? (
            <form action={addDropItemAction} className="grid items-end gap-3 rounded-md bg-surface-container-lowest p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <input type="hidden" name="dropId" value={drop.id} />
              <label className="block">
                <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">Add a cookie</span>
                <select
                  name="productId"
                  required
                  className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body"
                  defaultValue=""
                >
                  <option value="" disabled>— Pick a cookie —</option>
                  {remainingCookies.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <Field name="dozenPriceUsd" type="number" label="Dozen ($)" placeholder="24.00" required />
              <Field name="dozenInventory" type="number" label="Inventory" placeholder="(unlimited)" />
              <button type="submit" className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline">
                + Add
              </button>
            </form>
          ) : items.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No cookies in the catalog yet. <Link href="/admin/products/new" className="text-primary underline">Add a product</Link> first.
            </p>
          ) : null}
        </div>
      </NibbleCard>

      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-headline text-xl font-bold text-primary">Announce to subscribers</h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            {subscriberCountRow} active {subscriberCountRow === 1 ? "subscriber" : "subscribers"}
          </span>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">
          Sends a one-shot &ldquo;{drop.name} is live&rdquo; email to everyone on the nibbler list.
          {drop.announcementSentAt ? (
            <> Last sent {formatDate(drop.announcementSentAt, { dateStyle: "medium", timeStyle: "short" })}.</>
          ) : (
            <> Hasn&rsquo;t been sent yet.</>
          )}
        </p>
        <form action={sendDropAnnouncementAction} className="mt-4 flex flex-wrap items-end gap-4">
          <input type="hidden" name="dropId" value={drop.id} />
          {drop.announcementSentAt ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="force" className="h-4 w-4 accent-primary" />
              Send anyway (resend)
            </label>
          ) : null}
          <BiteButton size="md" disabled={subscriberCountRow === 0}>
            {drop.announcementSentAt ? "Resend announcement" : "Send announcement"}
          </BiteButton>
        </form>
      </NibbleCard>

      <p className="text-sm text-on-surface-variant">
        Public URL: <Link href={`/drops/${drop.slug}`} className="text-primary hover:underline">/drops/{drop.slug}</Link> ·
        Opens {formatDate(drop.opensAt, { dateStyle: "long", timeStyle: "short" })} → closes {formatDate(drop.closesAt, { dateStyle: "long", timeStyle: "short" })}
      </p>
    </div>
  );
}

function DeleteForm({ idValue, dropId }: { idValue: string; dropId: string }) {
  return (
    <form action={deleteDropItemAction}>
      <input type="hidden" name="id" value={idValue} />
      <input type="hidden" name="dropId" value={dropId} />
      <button
        type="submit"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
      >
        Remove
      </button>
    </form>
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
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
