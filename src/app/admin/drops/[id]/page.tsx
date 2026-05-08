import Link from "next/link";
import { notFound } from "next/navigation";
import { count, isNull } from "drizzle-orm";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { dropSubscribers } from "@/db/schema/drops";
import { formatCents, formatDate } from "@/lib/format";
import { updateDropAction, updateDropItemAction, sendDropAnnouncementAction } from "../actions";

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

  const [drop, allBoxes, subscriberCount] = await Promise.all([
    db.query.drops.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      with: {
        cookieBox: true,
        items: {
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
          with: {
            cookieBoxItem: { with: { product: true } },
          },
        },
      },
    }),
    db.query.cookieBoxes.findMany({
      where: (t, { eq }) => eq(t.isHidden, false),
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
    db
      .select({ c: count() })
      .from(dropSubscribers)
      .where(isNull(dropSubscribers.unsubscribedAt))
      .then((r) => r[0]?.c ?? 0),
  ]);

  if (!drop) notFound();

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
        {drop.cookieBox ? (
          <p className="mt-1 text-sm text-on-surface-variant">
            Box:{" "}
            <Link
              href={`/admin/cookie-boxes/${drop.cookieBox.id}`}
              className="text-primary hover:underline"
            >
              {drop.cookieBox.name}
            </Link>
          </p>
        ) : null}
      </header>

      {announced ? (
        <p className="rounded-md bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
          Announcement sent to {announced}{" "}
          {Number(announced) === 1 ? "subscriber" : "subscribers"}.
        </p>
      ) : null}
      {error === "already-sent" ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          An announcement was already sent for this drop. Tick &ldquo;Send anyway&rdquo; to resend.
        </p>
      ) : null}

      {/* Drop details */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <h2 className="font-headline text-xl font-bold text-primary">Drop details</h2>
        <form action={updateDropAction} className="mt-4 space-y-6">
          <input type="hidden" name="id" value={drop.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Drop name" defaultValue={drop.name} required />
            <Field name="slug" label="URL slug" defaultValue={drop.slug} required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                Cookie box
              </span>
              <select
                name="cookieBoxId"
                defaultValue={drop.cookieBoxId ?? ""}
                className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body"
              >
                <option value="">— None —</option>
                {allBoxes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {drop.cookieBoxId ? (
                <p className="mt-1 text-xs text-on-surface-variant">
                  Changing the box will reset cookie pricing for this drop.
                </p>
              ) : null}
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
            <Field
              name="opensAt"
              type="datetime-local"
              label="Opens at"
              defaultValue={toLocalIso(drop.opensAt)}
              required
            />
            <Field
              name="closesAt"
              type="datetime-local"
              label="Closes at"
              defaultValue={toLocalIso(drop.closesAt)}
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="fulfillmentStart"
              type="date"
              label="Fulfillment starts"
              defaultValue={String(drop.fulfillmentStart)}
              required
            />
            <Field
              name="fulfillmentEnd"
              type="date"
              label="Fulfillment ends"
              defaultValue={String(drop.fulfillmentEnd)}
              required
            />
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

      {/* Cookie pricing */}
      {drop.items.length > 0 ? (
        <NibbleCard bite="none" className="p-6 md:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="font-headline text-xl font-bold text-primary">
              Cookie pricing for this drop
            </h2>
            <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
              {drop.items.length} {drop.items.length === 1 ? "cookie" : "cookies"} from{" "}
              {drop.cookieBox?.name ?? "the box"}
            </span>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Cookies are defined by the box. Set à la carte dozen pricing here.
          </p>

          <div className="mt-4 space-y-3">
            {drop.items.map((item) => {
              const p = item.cookieBoxItem.product;
              return (
                <form
                  key={item.id}
                  action={updateDropItemAction}
                  className="grid items-end gap-3 rounded-md bg-surface-container-low p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
                >
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="dropId" value={drop.id} />
                  <div>
                    <p className="font-medium text-on-surface">{p.name}</p>
                    {p.shortDescription ? (
                      <p className="text-xs text-on-surface-variant">{p.shortDescription}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Sold: {item.dozenSold}
                      {item.dozenInventory != null
                        ? ` / ${item.dozenInventory} dozen`
                        : " (unlimited)"}
                    </p>
                  </div>
                  <Field
                    name="dozenPriceUsd"
                    type="number"
                    label="Dozen ($)"
                    defaultValue={
                      item.dozenPriceCents > 0
                        ? (item.dozenPriceCents / 100).toFixed(2)
                        : ""
                    }
                    placeholder="24.00"
                  />
                  <Field
                    name="dozenInventory"
                    type="number"
                    label="Inventory"
                    defaultValue={String(item.dozenInventory ?? "")}
                  />
                  <button
                    type="submit"
                    className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                  >
                    Save
                  </button>
                </form>
              );
            })}
          </div>
        </NibbleCard>
      ) : drop.cookieBoxId ? (
        <NibbleCard bite="none" className="p-6 md:p-10">
          <p className="text-sm text-on-surface-variant">
            The linked box has no cookies yet.{" "}
            <Link
              href={`/admin/cookie-boxes/${drop.cookieBoxId}`}
              className="text-primary underline"
            >
              Add cookies to the box
            </Link>{" "}
            first.
          </p>
        </NibbleCard>
      ) : null}

      {/* Announce */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-headline text-xl font-bold text-primary">
            Announce to subscribers
          </h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            {subscriberCount} active {subscriberCount === 1 ? "subscriber" : "subscribers"}
          </span>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">
          Sends a one-shot &ldquo;{drop.name} is live&rdquo; email to all email subscribers.
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
          <BiteButton size="md" disabled={subscriberCount === 0}>
            {drop.announcementSentAt ? "Resend announcement" : "Send announcement"}
          </BiteButton>
        </form>
      </NibbleCard>

      <p className="text-sm text-on-surface-variant">
        Public URL:{" "}
        <Link href={`/drops/${drop.slug}`} className="text-primary hover:underline">
          /drops/{drop.slug}
        </Link>{" "}
        · Opens {formatDate(drop.opensAt, { dateStyle: "long", timeStyle: "short" })} → closes{" "}
        {formatDate(drop.closesAt, { dateStyle: "long", timeStyle: "short" })}
      </p>
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
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
        {label}
      </span>
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
