import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { updateRecipeAction } from "../../actions";
import { RecipeIngredientsClient } from "./RecipeIngredientsClient";

export default async function RecipeEditPage({
  params,
}: {
  params: Promise<{ productId: string; recipeId: string }>;
}) {
  await requireAdmin();
  const { productId, recipeId } = await params;

  const [product, recipe] = await Promise.all([
    db.query.products.findFirst({
      where: (t, { eq }) => eq(t.id, productId),
      columns: { id: true, name: true },
    }),
    db.query.productRecipes.findFirst({
      where: (t, { eq }) => eq(t.id, recipeId),
      with: {
        recipeIngredients: {
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
          with: { ingredient: true },
        },
      },
    }),
  ]);

  if (!product || !recipe || recipe.productId !== productId) notFound();

  const action = updateRecipeAction.bind(null, recipeId, productId);

  return (
    <section>
      <Link
        href={`/admin/cookbook/${productId}`}
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← {product.name}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Recipe
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="font-headline text-3xl font-extrabold text-primary">
              {recipe.name}
            </h1>
            {recipe.isDefault && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-label text-[10px] uppercase tracking-wider text-primary">
                default
              </span>
            )}
          </div>
        </div>
        <BiteButton
          href={`/admin/cookbook/${productId}/${recipeId}/prep`}
          size="md"
          variant="secondary"
          biteColor="var(--color-surface-container-lowest)"
        >
          Print prep sheet
        </BiteButton>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Left: batch details form */}
        <NibbleCard bite="none" className="p-6 md:p-8 lg:col-span-2">
          <h2 className="font-headline text-lg font-bold text-primary">Batch details</h2>
          <form action={action} className="mt-4 space-y-4">
            <div>
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Recipe name
              </label>
              <input
                name="name"
                required
                defaultValue={recipe.name}
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Batch yield (cookies) *
              </label>
              <input
                name="batchYield"
                type="number"
                min="1"
                required
                defaultValue={recipe.batchYield}
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                  Bake temp (°F)
                </label>
                <input
                  name="bakeTemp"
                  type="number"
                  defaultValue={recipe.bakeTemp ?? ""}
                  placeholder="350"
                  className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                  Scoop size
                </label>
                <input
                  name="scoopSize"
                  defaultValue={recipe.scoopSize ?? ""}
                  placeholder="Medium"
                  className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                  Min (min)
                </label>
                <input
                  name="bakeTimeMin"
                  type="number"
                  defaultValue={recipe.bakeTimeMin ?? ""}
                  placeholder="13"
                  className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                  Max (min)
                </label>
                <input
                  name="bakeTimeMax"
                  type="number"
                  defaultValue={recipe.bakeTimeMax ?? ""}
                  placeholder="15"
                  className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                  Per pan
                </label>
                <input
                  name="cookiesPerPan"
                  type="number"
                  defaultValue={recipe.cookiesPerPan ?? ""}
                  placeholder="8"
                  className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Directions
              </label>
              <textarea
                name="directions"
                rows={10}
                defaultValue={recipe.directions ?? ""}
                placeholder={"1. Preheat oven to 350°F…\n2. Cream butter and sugars…"}
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={recipe.notes ?? ""}
                placeholder="Storage, substitutions, tips…"
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <BiteButton
              type="submit"
              size="md"
              biteColor="var(--color-surface-container-lowest)"
            >
              Save details
            </BiteButton>
          </form>
        </NibbleCard>

        {/* Right: ingredients + cost */}
        <div className="lg:col-span-3">
          <RecipeIngredientsClient
            recipeId={recipeId}
            productId={productId}
            batchYield={recipe.batchYield}
            isDefault={recipe.isDefault}
            initialIngredients={recipe.recipeIngredients.map((ri) => ({
              id: ri.id,
              batchQuantity: ri.batchQuantity,
              unit: ri.unit,
              batchQuantityGrams: ri.batchQuantityGrams,
              notes: ri.notes,
              sortOrder: ri.sortOrder,
              ingredient: {
                id: ri.ingredient.id,
                name: ri.ingredient.name,
                defaultUnit: ri.ingredient.defaultUnit,
                purchaseCostCents: ri.ingredient.purchaseCostCents,
                purchaseQuantity: ri.ingredient.purchaseQuantity,
                purchaseUnit: ri.ingredient.purchaseUnit,
              },
            }))}
          />
        </div>
      </div>
    </section>
  );
}
