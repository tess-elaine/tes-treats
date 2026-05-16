import Link from "next/link";
import { db } from "@/db";
import { products } from "@/db/schema/catalog";
import { ilike, asc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-helpers";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminPagination } from "@/components/admin/admin-pagination";

export const metadata = { title: "Cookbook" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function CookbookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const q = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);

  const where = q ? ilike(products.name, `%${q}%`) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(products)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const [productList, allRecipes] = await Promise.all([
    db.query.products.findMany({
      where: q ? (t, { ilike: ilikeQ }) => ilikeQ(t.name, `%${q}%`) : undefined,
      orderBy: (t, { asc: ascQ }) => [ascQ(t.sortOrder), ascQ(t.name)],
      columns: { id: true, name: true },
      limit: PAGE_SIZE,
      offset: (safePage - 1) * PAGE_SIZE,
    }),
    db.query.productRecipes.findMany({
      columns: { id: true, productId: true, name: true, isDefault: true, batchYield: true },
      orderBy: (t, { asc: ascQ }) => [ascQ(t.sortOrder)],
    }),
  ]);

  const recipesByProduct = new Map<string, typeof allRecipes>();
  for (const r of allRecipes) {
    const list = recipesByProduct.get(r.productId) ?? [];
    list.push(r);
    recipesByProduct.set(r.productId, list);
  }

  const searchString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
  ).toString();

  return (
    <section>
      <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">Admin</p>
      <h1 className="mt-1 font-headline text-3xl font-extrabold text-primary">Cookbook</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
        Batch recipes, ingredient quantities, bake instructions, and cost calculations — one place to replace the spreadsheet.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AdminSearch defaultValue={q} searchString={searchString} placeholder="Search products…" />
      </div>

      <div className="mt-4 space-y-3">
        {productList.length === 0 ? (
          <NibbleCard bite="none" className="p-10 text-center">
            <p className="text-tertiary">{q ? "No products match your search." : "No products yet."}</p>
          </NibbleCard>
        ) : (
          productList.map((p) => {
            const recipes = recipesByProduct.get(p.id) ?? [];
            return (
              <NibbleCard key={p.id} bite="none" className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/cookbook/${p.id}`}
                      className="font-headline text-lg font-bold text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {recipes.length === 0 ? (
                        <span className="text-xs text-on-surface-variant/60">No recipes yet</span>
                      ) : (
                        recipes.map((r) => (
                          <span
                            key={r.id}
                            className={[
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                              r.isDefault
                                ? "bg-primary/10 text-primary"
                                : "bg-surface-container-high text-on-surface-variant",
                            ].join(" ")}
                          >
                            {r.name}
                            <span className="opacity-60">· {r.batchYield} cookies</span>
                            {r.isDefault && (
                              <span className="ml-0.5 rounded-full bg-primary/20 px-1 text-[10px] font-semibold uppercase tracking-wide">
                                default
                              </span>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <BiteButton
                    href={`/admin/cookbook/${p.id}`}
                    size="md"
                    variant={recipes.length === 0 ? "primary" : "secondary"}
                    biteColor="var(--color-surface-container-lowest)"
                  >
                    {recipes.length === 0 ? "Add recipe" : "View recipes"}
                  </BiteButton>
                </div>
              </NibbleCard>
            );
          })
        )}
      </div>

      {Number(total) > 0 && (
        <NibbleCard bite="none" className="mt-3 overflow-hidden">
          <AdminPagination page={safePage} pageCount={pageCount} total={Number(total)} searchString={searchString} />
        </NibbleCard>
      )}
    </section>
  );
}
