import Link from "next/link";
import { sql } from "drizzle-orm";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { productCategories, products } from "@/db/schema/catalog";
import {
  toggleCategoryActiveAction,
  deleteCategoryAction,
} from "./actions";

export const metadata = { title: "Admin · Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  // Each row is a category with its product count, so admin can see what's safe to delete.
  const rows = await db
    .select({
      id: productCategories.id,
      slug: productCategories.slug,
      name: productCategories.name,
      description: productCategories.description,
      sortOrder: productCategories.sortOrder,
      isActive: productCategories.isActive,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(productCategories)
    .leftJoin(products, sql`${products.categoryId} = ${productCategories.id}`)
    .groupBy(productCategories.id)
    .orderBy(productCategories.sortOrder, productCategories.name);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Catalog
          </p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
            Product categories
          </h1>
          <p className="mt-2 text-tertiary">
            Cookies, pies, bars, etc. The product form&rsquo;s category picker
            pulls from this list.
          </p>
        </div>
        <BiteButton href="/admin/categories/new" size="md">+ New category</BiteButton>
      </header>

      {rows.length === 0 ? (
        <NibbleCard bite="none" className="p-10 text-center">
          <p className="text-tertiary">No categories yet.</p>
        </NibbleCard>
      ) : (
        <NibbleCard bite="none" className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Sort</Th>
                <Th>Products</Th>
                <Th>Active</Th>
                <Th><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-outline-variant/15">
                  <Td>
                    <Link href={`/admin/categories/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                    {c.description ? (
                      <p className="text-xs text-on-surface-variant">{c.description}</p>
                    ) : null}
                  </Td>
                  <Td className="font-mono text-xs">{c.slug}</Td>
                  <Td>{c.sortOrder}</Td>
                  <Td>{c.productCount}</Td>
                  <Td>{c.isActive ? "Active" : "Hidden"}</Td>
                  <Td>
                    <div className="flex gap-3">
                      <form action={toggleCategoryActiveAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                        >
                          {c.isActive ? "Hide" : "Show"}
                        </button>
                      </form>
                      <form action={deleteCategoryAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          disabled={c.productCount > 0}
                          title={c.productCount > 0 ? "Reassign products before deleting" : "Delete"}
                          className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline disabled:opacity-40 disabled:no-underline disabled:hover:no-underline"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </NibbleCard>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
