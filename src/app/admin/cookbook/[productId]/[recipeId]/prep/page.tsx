import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { PrepSheetClient } from "./PrepSheetClient";

export default async function PrepSheetPage({
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
          with: { ingredient: { columns: { id: true, name: true, defaultUnit: true } } },
        },
      },
    }),
  ]);

  if (!product || !recipe || recipe.productId !== productId) notFound();

  return (
    <PrepSheetClient
      product={{ name: product.name }}
      recipe={{
        name: recipe.name,
        batchYield: recipe.batchYield,
        bakeTemp: recipe.bakeTemp,
        bakeTimeMin: recipe.bakeTimeMin,
        bakeTimeMax: recipe.bakeTimeMax,
        scoopSize: recipe.scoopSize,
        cookiesPerPan: recipe.cookiesPerPan,
        directions: recipe.directions,
        notes: recipe.notes,
        ingredients: recipe.recipeIngredients.map((ri) => ({
          id: ri.id,
          name: ri.ingredient.name,
          batchQuantity: ri.batchQuantity,
          unit: ri.unit,
          batchQuantityGrams: ri.batchQuantityGrams,
          notes: ri.notes,
        })),
      }}
      backHref={`/admin/cookbook/${productId}/${recipeId}`}
    />
  );
}
