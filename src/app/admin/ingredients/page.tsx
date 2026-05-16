import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSortTh, Th } from "@/components/admin/admin-sort-th";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { db } from "@/db";
import { ingredients } from "@/db/schema/catalog";
import { ilike, and, asc, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-helpers";
import { ALLERGEN_LABELS } from "@/lib/allergens";
import { formatCents } from "@/lib/format";
import { deleteIngredientAction } from "./actions";

export const metadata = { title: "Ingredients" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const blank = <span className="text-on-surface-variant/30">—</span>;

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q ?? "";
  const sort = params.sort ?? "";
  const order = params.order ?? "asc";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const error = params.error;

  const where = q ? ilike(ingredients.name, `%${q}%`) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(ingredients)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const sortExpr = (() => {
    const dir = order === "desc" ? desc : asc;
    if (sort === "unit") return dir(ingredients.defaultUnit);
    if (sort === "cost") return dir(ingredients.purchaseCostCents);
    return asc(ingredients.name);
  })();

  const list = await db.query.ingredients.findMany({
    where: (t, { ilike: ilikeQ }) => (q ? ilikeQ(t.name, `%${q}%`) : undefined),
    orderBy: () => [sortExpr],
    limit: PAGE_SIZE,
    offset: (safePage - 1) * PAGE_SIZE,
    with: {
      productIngredients: { columns: { id: true } },
      recipeIngredients: { columns: { id: true } },
    },
  });

  const searchString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
  ).toString();

  const isEmpty = list.length === 0;

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">Admin</p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold text-primary">Ingredients</h1>
        </div>
        <BiteButton href="/admin/ingredients/new" size="md">+ New ingredient</BiteButton>
      </div>

      {error === "in-use" && (
        <p className="mt-4 rounded-md bg-error-container px-4 py-2 text-sm text-on-error-container">
          That ingredient is still in use and cannot be deleted — remove it from all products and recipes first.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AdminSearch defaultValue={q} searchString={searchString} placeholder="Search ingredients…" />
      </div>

      <NibbleCard bite="none" className="mt-4 overflow-x-auto">
        {isEmpty ? (
          <p className="p-8 text-center text-tertiary">
            {q ? "No ingredients match your search." : "No ingredients yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                <AdminSortTh column="name" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Name</AdminSortTh>
                <AdminSortTh column="unit" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Unit</AdminSortTh>
                <Th>g / unit</Th>
                <AdminSortTh column="cost" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Cost</AdminSortTh>
                <Th>Pkg</Th>
                <Th>Allergens</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {list.map((ing) => {
                const hasCost = ing.purchaseCostCents != null;
                const hasPkg = ing.purchaseQuantity != null && ing.purchaseUnit;
                const hasGrams = ing.gramsPerUnit != null && ing.defaultUnit !== "g";
                const needsGrams = ing.defaultUnit !== "g" && !hasGrams;
                const canDelete =
                  ing.productIngredients.length === 0 && ing.recipeIngredients.length === 0;

                const deleteBlockedTitle = (() => {
                  const p = ing.productIngredients.length;
                  const r = ing.recipeIngredients.length;
                  const parts: string[] = [];
                  if (p) parts.push(`${p} product${p === 1 ? "" : "s"}`);
                  if (r) parts.push(`${r} recipe${r === 1 ? "" : "s"}`);
                  return `Used in ${parts.join(" and ")} — remove from those first`;
                })();

                return (
                  <tr key={ing.id} className="border-b border-outline-variant/40 hover:bg-surface-container-low">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/ingredients/${ing.id}/edit`} className="text-primary hover:underline">
                        {ing.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{ing.defaultUnit}</td>
                    <td className="px-4 py-3">
                      {ing.defaultUnit === "g" ? (
                        <span className="text-xs text-on-surface-variant/40" title="Already measured in grams — no conversion needed">1 g/g</span>
                      ) : needsGrams ? (
                        <span className="text-amber-600/70">—</span>
                      ) : (
                        <span className="text-on-surface-variant">{parseFloat(ing.gramsPerUnit!).toLocaleString()}g</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasCost ? (
                        <span className="text-on-surface-variant">{formatCents(ing.purchaseCostCents!)}</span>
                      ) : (
                        <span className="text-amber-600/70">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasPkg ? (
                        <span className="text-on-surface-variant">{parseFloat(ing.purchaseQuantity!).toLocaleString()} {ing.purchaseUnit}</span>
                      ) : (
                        <span className="text-amber-600/70">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {ing.allergens.length === 0
                        ? blank
                        : ing.allergens.map((a) => ALLERGEN_LABELS[a as keyof typeof ALLERGEN_LABELS] ?? a).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canDelete ? (
                        <form action={deleteIngredientAction}>
                          <input type="hidden" name="id" value={ing.id} />
                          <ConfirmSubmit
                            message={`Delete "${ing.name}"? This cannot be undone.`}
                            className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant hover:text-on-error-container"
                          >
                            Delete
                          </ConfirmSubmit>
                        </form>
                      ) : (
                        <span title={deleteBlockedTitle} className="cursor-not-allowed font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant/25 select-none">
                          Delete
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <AdminPagination page={safePage} pageCount={pageCount} total={Number(total)} searchString={searchString} />
      </NibbleCard>
    </section>
  );
}
