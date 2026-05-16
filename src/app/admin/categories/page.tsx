import Link from "next/link";
import { sql, ilike, or, and, asc, desc } from "drizzle-orm";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSortTh, Th } from "@/components/admin/admin-sort-th";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { db } from "@/db";
import { productCategories, products } from "@/db/schema/catalog";
import { toggleCategoryActiveAction, deleteCategoryAction } from "./actions";

export const metadata = { title: "Admin · Categories" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sort = params.sort ?? "";
  const order = params.order ?? "asc";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);

  const searchWhere = q
    ? or(
        ilike(productCategories.name, `%${q}%`),
        ilike(productCategories.slug, `%${q}%`),
      )
    : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(productCategories)
    .where(searchWhere);

  const pageCount = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const sortExpr = (() => {
    const dir = order === "desc" ? "desc" : "asc";
    if (sort === "products") {
      return dir === "asc"
        ? sql`count(${products.id}) asc`
        : sql`count(${products.id}) desc`;
    }
    const col =
      sort === "name"
        ? productCategories.name
        : sort === "active"
          ? productCategories.isActive
          : productCategories.sortOrder;
    return dir === "asc" ? asc(col) : desc(col);
  })();

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
    .where(searchWhere)
    .groupBy(productCategories.id)
    .orderBy(sortExpr)
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  const searchString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
  ).toString();

  const isEmpty = rows.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">Catalog</p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">Product categories</h1>
          <p className="mt-2 text-tertiary">Cookies, pies, bars, etc. The product form&rsquo;s category picker pulls from this list.</p>
        </div>
        <BiteButton href="/admin/categories/new" size="md">+ New category</BiteButton>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch defaultValue={q} searchString={searchString} placeholder="Search categories…" />
      </div>

      <NibbleCard bite="none" className="overflow-hidden">
        {isEmpty ? (
          <p className="p-10 text-center text-tertiary">
            {q ? "No categories match your search." : "No categories yet."}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <AdminSortTh column="name" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Name</AdminSortTh>
                <Th>Slug</Th>
                <AdminSortTh column="order" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Sort</AdminSortTh>
                <AdminSortTh column="products" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Products</AdminSortTh>
                <AdminSortTh column="active" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Active</AdminSortTh>
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
                    {c.description ? <p className="text-xs text-on-surface-variant">{c.description}</p> : null}
                  </Td>
                  <Td className="font-mono text-xs">{c.slug}</Td>
                  <Td>{c.sortOrder}</Td>
                  <Td>{c.productCount}</Td>
                  <Td>{c.isActive ? "Active" : "Hidden"}</Td>
                  <Td>
                    <div className="flex gap-3">
                      <form action={toggleCategoryActiveAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline">
                          {c.isActive ? "Hide" : "Show"}
                        </button>
                      </form>
                      <form action={deleteCategoryAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmSubmit
                          message={`Delete category "${c.name ?? c.slug}" permanently?`}
                          disabled={c.productCount > 0}
                          title={c.productCount > 0 ? "Reassign products before deleting" : "Delete"}
                          className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline disabled:opacity-40 disabled:no-underline disabled:hover:no-underline"
                        >
                          Delete
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <AdminPagination page={safePage} pageCount={pageCount} total={Number(total)} searchString={searchString} />
      </NibbleCard>
    </div>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
