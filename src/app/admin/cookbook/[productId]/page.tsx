import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { formatCents } from "@/lib/format";
import { setDefaultRecipeAction } from "../actions";
import { DeleteRecipeButton } from "../DeleteRecipeButton";
import { calcTotalBatchCostCents } from "@/lib/cookbook";

export default async function ProductCookbookPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdmin();
  const { productId } = await params;

  const product = await db.query.products.findFirst({
    where: (t, { eq }) => eq(t.id, productId),
    columns: { id: true, name: true },
  });
  if (!product) notFound();

  const recipes = await db.query.productRecipes.findMany({
    where: (t, { eq }) => eq(t.productId, productId),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)],
    with: {
      recipeIngredients: {
        orderBy: (t, { asc }) => [asc(t.sortOrder)],
        with: { ingredient: true },
      },
    },
  });

  return (
    <section>
      <Link
        href="/admin/cookbook"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← Cookbook
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Cookbook
          </p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold text-primary">
            {product.name}
          </h1>
        </div>
        <BiteButton
          href={`/admin/cookbook/${productId}/new`}
          size="md"
          biteColor="var(--color-surface-container-lowest)"
        >
          + Add recipe
        </BiteButton>
      </div>

      {recipes.length === 0 ? (
        <NibbleCard bite="none" className="mt-8 p-10 text-center">
          <p className="text-on-surface-variant">No recipes yet.</p>
          <div className="mt-4">
            <BiteButton
              href={`/admin/cookbook/${productId}/new`}
              size="md"
              biteColor="var(--color-surface-container-lowest)"
            >
              Create first recipe
            </BiteButton>
          </div>
        </NibbleCard>
      ) : (
        <div className="mt-6 space-y-4">
          {recipes.map((recipe) => {
            const totalCostCents = calcTotalBatchCostCents(recipe.recipeIngredients);
            const costPerDozenCents =
              totalCostCents != null
                ? Math.round((totalCostCents / recipe.batchYield) * 12)
                : null;

            return (
              <NibbleCard key={recipe.id} bite="none" className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/cookbook/${productId}/${recipe.id}`}
                        className="font-headline text-xl font-bold text-primary hover:underline"
                      >
                        {recipe.name}
                      </Link>
                      {recipe.isDefault && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-label text-[10px] uppercase tracking-wider text-primary">
                          default
                        </span>
                      )}
                    </div>

                    <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-on-surface-variant">
                      <div className="flex gap-1">
                        <dt className="font-medium">Yield:</dt>
                        <dd>{recipe.batchYield} cookies</dd>
                      </div>
                      {recipe.bakeTemp && (
                        <div className="flex gap-1">
                          <dt className="font-medium">Bake:</dt>
                          <dd>
                            {recipe.bakeTemp}°F
                            {recipe.bakeTimeMin && recipe.bakeTimeMax
                              ? ` · ${recipe.bakeTimeMin}–${recipe.bakeTimeMax} min`
                              : recipe.bakeTimeMin
                              ? ` · ${recipe.bakeTimeMin} min`
                              : ""}
                          </dd>
                        </div>
                      )}
                      {recipe.scoopSize && (
                        <div className="flex gap-1">
                          <dt className="font-medium">Scoop:</dt>
                          <dd>{recipe.scoopSize}</dd>
                        </div>
                      )}
                      {recipe.cookiesPerPan && (
                        <div className="flex gap-1">
                          <dt className="font-medium">Per pan:</dt>
                          <dd>{recipe.cookiesPerPan}</dd>
                        </div>
                      )}
                      <div className="flex gap-1">
                        <dt className="font-medium">Ingredients:</dt>
                        <dd>{recipe.recipeIngredients.length}</dd>
                      </div>
                      {costPerDozenCents != null && (
                        <div className="flex gap-1">
                          <dt className="font-medium">Cost/dozen:</dt>
                          <dd className="text-primary font-semibold">{formatCents(costPerDozenCents)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <BiteButton
                      href={`/admin/cookbook/${productId}/${recipe.id}`}
                      size="md"
                      variant="secondary"
                      biteColor="var(--color-surface-container-lowest)"
                    >
                      Edit
                    </BiteButton>
                    <BiteButton
                      href={`/admin/cookbook/${productId}/${recipe.id}/prep`}
                      size="md"
                      variant="ghost"
                    >
                      Prep sheet
                    </BiteButton>
                    {!recipe.isDefault && (
                      <form
                        action={async () => {
                          "use server";
                          await setDefaultRecipeAction(recipe.id, productId);
                        }}
                      >
                        <BiteButton
                          type="submit"
                          size="md"
                          variant="ghost"
                          biteColor="var(--color-surface-container-lowest)"
                        >
                          Set as default
                        </BiteButton>
                      </form>
                    )}
                    <DeleteRecipeButton
                      recipeId={recipe.id}
                      productId={productId}
                      recipeName={recipe.name}
                    />
                  </div>
                </div>
              </NibbleCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
