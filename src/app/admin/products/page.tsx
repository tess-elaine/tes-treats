import Link from "next/link";
import Image from "next/image";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSortTh, Th } from "@/components/admin/admin-sort-th";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { db } from "@/db";
import { products } from "@/db/schema/catalog";
import { ilike, and, eq, asc, desc, sql } from "drizzle-orm";
import { formatCents } from "@/lib/format";
import { primaryImagesByProductIds, listCategories } from "@/lib/products";
import { deleteProductAction } from "./actions";

export const metadata = { title: "Admin · Products" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sort = params.sort ?? "";
  const order = params.order ?? "asc";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const categorySlug = params.category ?? "";
  const availFilter = params.available ?? "";

  const allCategories = await listCategories();
  const selectedCategory = categorySlug
    ? allCategories.find((c) => c.slug === categorySlug) ?? null
    : null;

  const where = and(
    q ? ilike(products.name, `%${q}%`) : undefined,
    selectedCategory ? eq(products.categoryId, selectedCategory.id) : undefined,
    availFilter === "yes"
      ? eq(products.isAvailable, true)
      : availFilter === "no"
        ? eq(products.isAvailable, false)
        : undefined,
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(products)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const sortExpr = (() => {
    const dir = order === "asc" ? asc : desc;
    if (sort === "name") return [dir(products.name)];
    if (sort === "available") return [dir(products.isAvailable), asc(products.name)];
    if (sort === "featured") return [dir(products.isFeatured), asc(products.name)];
    return [asc(products.sortOrder), asc(products.name)];
  })();

  const list = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(...sortExpr)
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  const [defaults, images] = await Promise.all([
    Promise.all(
      list.map(async (p) => {
        const v = await db.query.productVariants.findFirst({
          where: (t, { eq }) => eq(t.productId, p.id),
          orderBy: (t, { desc, asc }) => [desc(t.isDefault), asc(t.sortOrder)],
        });
        return [p.id, v ? { label: v.label, priceCents: v.priceCents } : null] as const;
      }),
    ),
    primaryImagesByProductIds(list.map((p) => p.id)),
  ]);
  const defaultsMap = new Map(defaults);
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  const searchString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
  ).toString();

  function filterHref(key: string, value: string | null) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sort) { p.set("sort", sort); p.set("order", order); }
    // Preserve other active filters
    if (key !== "category" && categorySlug) p.set("category", categorySlug);
    if (key !== "available" && availFilter) p.set("available", availFilter);
    if (value) p.set(key, value);
    const qs = p.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  const isEmpty = list.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">Catalog</p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">Products</h1>
        </div>
        <BiteButton href="/admin/products/new" size="md">+ New product</BiteButton>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch defaultValue={q} searchString={searchString} placeholder="Search products…" />
        {allCategories.length > 0 && (
          <nav className="flex flex-wrap gap-2">
            <FilterPill href={filterHref("category", null)} label="All" active={!categorySlug} />
            {allCategories.map((c) => (
              <FilterPill key={c.id} href={filterHref("category", c.slug)} label={c.name} active={categorySlug === c.slug} />
            ))}
          </nav>
        )}
        <nav className="flex flex-wrap gap-2">
          <FilterPill href={filterHref("available", null)} label="All" active={!availFilter} />
          <FilterPill href={filterHref("available", "yes")} label="Available" active={availFilter === "yes"} />
          <FilterPill href={filterHref("available", "no")} label="Hidden" active={availFilter === "no"} />
        </nav>
      </div>

      <NibbleCard bite="none" className="overflow-hidden">
        {isEmpty ? (
          <p className="p-10 text-center text-tertiary">
            {q || categorySlug || availFilter ? "No products match your search." : "No products yet."}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <AdminSortTh column="name" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Product</AdminSortTh>
                <Th>Category</Th>
                <Th>Default</Th>
                <AdminSortTh column="featured" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Featured</AdminSortTh>
                <AdminSortTh column="available" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Available</AdminSortTh>
                <Th>Public URL</Th>
                <Th><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const v = defaultsMap.get(p.id);
                const img = images.get(p.id);
                const cat = categoryMap.get(p.categoryId);
                return (
                  <tr key={p.id} className="border-t border-outline-variant/15">
                    <Td>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-medium text-primary hover:underline">
                        {img ? (
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-container">
                            <Image src={img} alt="" fill sizes="40px" className="object-cover" />
                          </span>
                        ) : (
                          <span className="h-10 w-10 shrink-0 rounded-md bg-surface-container" />
                        )}
                        <span>{p.name}</span>
                      </Link>
                    </Td>
                    <Td>{cat?.name ?? "—"}</Td>
                    <Td>{v ? `${v.label} · ${formatCents(v.priceCents)}` : "—"}</Td>
                    <Td>{p.isFeatured ? "Yes" : "No"}</Td>
                    <Td>{p.isAvailable ? "Yes" : "No"}</Td>
                    <Td>
                      <Link href={`/shop/${p.slug}`} className="text-on-surface-variant hover:text-primary">
                        /shop/{p.slug}
                      </Link>
                    </Td>
                    <Td>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmit message={`Delete "${p.name}" permanently?`} className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-error">
                          Delete
                        </ConfirmSubmit>
                      </form>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <AdminPagination page={safePage} pageCount={pageCount} total={Number(total)} searchString={searchString} />
      </NibbleCard>
    </div>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`rounded-full px-3 py-1 font-label text-xs uppercase tracking-[0.12em] transition-colors ${active ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary"}`}>
      {label}
    </Link>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className ?? ""}`}>{children}</td>;
}
