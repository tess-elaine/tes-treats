import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { products } from "@/db/schema/catalog";
import { updateCategoryAction, deleteCategoryAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCategoryDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const cat = await db.query.productCategories.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!cat) notFound();

  const [{ c: productCount }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(products)
    .where(sql`${products.categoryId} = ${id}`);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/categories"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All categories
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Category
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
            {cat.name}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {productCount} {productCount === 1 ? "product" : "products"} in this category
          </p>
        </div>
        <form action={deleteCategoryAction}>
          <input type="hidden" name="id" value={cat.id} />
          <button
            type="submit"
            disabled={productCount > 0}
            className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline disabled:opacity-40 disabled:no-underline disabled:hover:no-underline"
            title={productCount > 0 ? "Reassign products before deleting" : "Delete category"}
          >
            Delete category
          </button>
        </form>
      </header>

      {error === "in-use" ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          Can&rsquo;t delete: {productCount} {productCount === 1 ? "product is" : "products are"}{" "}
          still in this category. Reassign them first.
        </p>
      ) : null}

      <NibbleCard bite="none" className="p-6 md:p-10">
        <form action={updateCategoryAction} className="space-y-5">
          <input type="hidden" name="id" value={cat.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Name" defaultValue={cat.name} required />
            <Field name="slug" label="Slug" defaultValue={cat.slug} />
          </div>
          <Field name="description" label="Description" defaultValue={cat.description ?? ""} />
          <Field name="sortOrder" type="number" label="Sort order" defaultValue={String(cat.sortOrder)} />
          <Toggle name="isActive" label="Active" defaultChecked={cat.isActive} />
          <BiteButton size="lg">Save changes</BiteButton>
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
