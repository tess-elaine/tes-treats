import Link from "next/link";
import { notFound } from "next/navigation";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { db } from "@/db";
import { formatDate } from "@/lib/format";
import {
  updateBoxAction,
  deleteBoxAction,
  addBoxItemAction,
  updateBoxItemAction,
  deleteBoxItemAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCookieBoxDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [box, allProducts] = await Promise.all([
    db.query.cookieBoxes.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      with: {
        items: {
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
          with: { product: true },
        },
        drops: {
          orderBy: (t, { desc }) => [desc(t.opensAt)],
          columns: { id: true, name: true, opensAt: true, isPublished: true },
        },
      },
    }),
    db.query.products.findMany({
      where: (t, { eq }) => eq(t.isAvailable, true),
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
  ]);

  if (!box) notFound();

  const usedProductIds = new Set(box.items.map((i) => i.productId));
  const availableProducts = allProducts.filter((p) => !usedProductIds.has(p.id));

  return (
    <div className="space-y-8">
      <Link
        href="/admin/cookie-boxes"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All cookie boxes
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Cookie Box
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
            {box.name}
          </h1>
        </div>
        <form action={deleteBoxAction}>
          <input type="hidden" name="id" value={box.id} />
          <ConfirmSubmit
            message={`Delete "${box.name}" permanently? This cannot be undone if drops are linked.`}
            className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
          >
            Delete box
          </ConfirmSubmit>
        </form>
      </header>

      {/* Box details */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <h2 className="font-headline text-xl font-bold text-primary">Box details</h2>
        <form action={updateBoxAction} className="mt-4 space-y-5">
          <input type="hidden" name="id" value={box.id} />
          <Field name="name" label="Box name" defaultValue={box.name} required />
          <Field name="tagline" label="Short tagline" defaultValue={box.tagline ?? ""} />
          <label className="block">
            <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
              Description
            </span>
            <textarea
              name="description"
              rows={4}
              defaultValue={box.description ?? ""}
              className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
          </label>
          <Field name="notes" label="Notes (admin-only)" defaultValue={box.notes ?? ""} />
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isHidden"
              defaultChecked={box.isHidden}
              className="h-4 w-4 accent-primary"
            />
            <span>Hidden</span>
          </label>
          <BiteButton size="lg">Save changes</BiteButton>
        </form>
      </NibbleCard>

      {/* Cookies in this box */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-headline text-xl font-bold text-primary">
            Cookies in this box
          </h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            {box.items.length} {box.items.length === 1 ? "cookie" : "cookies"}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {box.items.map((item) => (
            <div
              key={item.id}
              className="grid items-center gap-3 rounded-md bg-surface-container-low p-4 sm:grid-cols-[2fr_1fr_auto_auto]"
            >
              <div>
                <p className="font-medium text-on-surface">{item.product.name}</p>
                {item.product.shortDescription ? (
                  <p className="text-xs text-on-surface-variant">
                    {item.product.shortDescription}
                  </p>
                ) : null}
              </div>
              <form action={updateBoxItemAction} className="flex items-end gap-2">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="cookieBoxId" value={box.id} />
                <label className="block flex-1">
                  <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
                    Sort
                  </span>
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={item.sortOrder}
                    className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                >
                  Save
                </button>
              </form>
              <form action={deleteBoxItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="cookieBoxId" value={box.id} />
                <ConfirmSubmit
                  message={`Remove ${item.product.name} from this box?`}
                  className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
                >
                  Remove
                </ConfirmSubmit>
              </form>
            </div>
          ))}

          {availableProducts.length > 0 ? (
            <form
              action={addBoxItemAction}
              className="flex flex-wrap items-end gap-3 rounded-md bg-surface-container-lowest p-4"
            >
              <input type="hidden" name="cookieBoxId" value={box.id} />
              <label className="block flex-1">
                <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                  Add a cookie
                </span>
                <select
                  name="productId"
                  required
                  className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body"
                  defaultValue=""
                >
                  <option value="" disabled>
                    — Pick a cookie —
                  </option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
              >
                + Add
              </button>
            </form>
          ) : box.items.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No cookies in the catalog yet.{" "}
              <Link href="/admin/products/new" className="text-primary underline">
                Add a product
              </Link>{" "}
              first.
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant">All available cookies are in this box.</p>
          )}
        </div>
      </NibbleCard>

      {/* Drops that have used this box */}
      {box.drops.length > 0 ? (
        <NibbleCard bite="none" className="p-6 md:p-10">
          <h2 className="font-headline text-xl font-bold text-primary">
            Drops using this box
          </h2>
          <ul className="mt-4 space-y-2">
            {box.drops.map((d) => (
              <li key={d.id} className="flex items-baseline gap-3">
                <Link
                  href={`/admin/drops/${d.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {d.name}
                </Link>
                <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
                  {formatDate(d.opensAt)} · {d.isPublished ? "Published" : "Draft"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <BiteButton href="/admin/drops/new" size="md" variant="secondary">
              + New drop with this box
            </BiteButton>
          </div>
        </NibbleCard>
      ) : null}
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
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
        {label}
      </span>
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
