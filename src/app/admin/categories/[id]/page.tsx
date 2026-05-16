import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { db } from "@/db";
import { products } from "@/db/schema/catalog";
import { deleteCategoryAction } from "../actions";
import { CategoryEditClient } from "./CategoryEditClient";

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
          <ConfirmSubmit
            message={`Delete category "${cat.name}" permanently?`}
            disabled={productCount > 0}
            className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline disabled:opacity-40 disabled:no-underline disabled:hover:no-underline"
            title={productCount > 0 ? "Reassign products before deleting" : "Delete category"}
          >
            Delete category
          </ConfirmSubmit>
        </form>
      </header>

      {error === "in-use" ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          Can&rsquo;t delete: {productCount}{" "}
          {productCount === 1 ? "product is" : "products are"} still in this category. Reassign
          them first.
        </p>
      ) : null}

      <CategoryEditClient cat={cat} />
    </div>
  );
}
