import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { ALLERGEN_LABELS } from "@/lib/allergens";
import { formatCents } from "@/lib/format";
import { deleteIngredientAction } from "./actions";

export const metadata = { title: "Ingredients" };
export const dynamic = "force-dynamic";

const blank = <span className="text-on-surface-variant/30">—</span>;

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  const list = await db.query.ingredients.findMany({
    orderBy: (t, { asc }) => [asc(t.name)],
    with: {
      productIngredients: { columns: { id: true } },
      recipeIngredients: { columns: { id: true } },
    },
  });

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Admin
          </p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold text-primary">
            Ingredients
          </h1>
        </div>
        <BiteButton href="/admin/ingredients/new" size="md">
          + New ingredient
        </BiteButton>
      </div>

      {error === "in-use" && (
        <p className="mt-4 rounded-md bg-error-container px-4 py-2 text-sm text-on-error-container">
          That ingredient is still in use and cannot be deleted — remove it from all products and recipes first.
        </p>
      )}

      <NibbleCard bite="none" className="mt-8 overflow-x-auto">
        {list.length === 0 ? (
          <p className="p-8 text-center text-tertiary">No ingredients yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em]">Name</th>
                <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em]">Unit</th>
                <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em]">g / unit</th>
                <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em]">Cost</th>
                <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em]">Pkg</th>
                <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em]">Allergens</th>
                <th className="px-4 py-3" />
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
                  <tr
                    key={ing.id}
                    className="border-b border-outline-variant/40 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/ingredients/${ing.id}/edit`}
                        className="text-primary hover:underline"
                      >
                        {ing.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {ing.defaultUnit}
                    </td>
                    <td className="px-4 py-3">
                      {ing.defaultUnit === "g" ? (
                        <span
                          className="text-on-surface-variant/40 text-xs"
                          title="Already measured in grams — no conversion needed"
                        >
                          1 g/g
                        </span>
                      ) : needsGrams ? (
                        <span className="text-amber-600/70">—</span>
                      ) : (
                        <span className="text-on-surface-variant">
                          {parseFloat(ing.gramsPerUnit!).toLocaleString()}g
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasCost ? (
                        <span className="text-on-surface-variant">
                          {formatCents(ing.purchaseCostCents!)}
                        </span>
                      ) : (
                        <span className="text-amber-600/70">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasPkg ? (
                        <span className="text-on-surface-variant">
                          {parseFloat(ing.purchaseQuantity!).toLocaleString()} {ing.purchaseUnit}
                        </span>
                      ) : (
                        <span className="text-amber-600/70">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {ing.allergens.length === 0
                        ? blank
                        : ing.allergens
                            .map((a) => ALLERGEN_LABELS[a as keyof typeof ALLERGEN_LABELS] ?? a)
                            .join(", ")}
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
                        <span
                          title={deleteBlockedTitle}
                          className="cursor-not-allowed font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant/25 select-none"
                        >
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
      </NibbleCard>
    </section>
  );
}
