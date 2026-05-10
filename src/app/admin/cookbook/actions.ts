"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  productRecipes,
  recipeIngredients,
  recipeSteps,
  productIngredients,
  ingredients,
} from "@/db/schema/catalog";
import { requireAdmin } from "@/lib/auth-helpers";

function s(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}
function num(v: FormDataEntryValue | null): number | null {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? null : n;
}
function int(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Sync the default recipe's ingredients → productIngredients for allergen display
// ---------------------------------------------------------------------------
async function syncProductIngredients(recipeId: string, productId: string) {
  const recipe = await db.query.productRecipes.findFirst({
    where: (t, { eq }) => eq(t.id, recipeId),
    with: { recipeIngredients: { orderBy: (t, { asc }) => [asc(t.sortOrder)] } },
  });
  if (!recipe) return;

  await db.delete(productIngredients).where(eq(productIngredients.productId, productId));

  if (recipe.recipeIngredients.length === 0) return;

  await db.insert(productIngredients).values(
    recipe.recipeIngredients.map((ri, i) => {
      const useGrams = ri.batchQuantityGrams != null;
      const qty = useGrams
        ? (parseFloat(ri.batchQuantityGrams!) / recipe.batchYield).toFixed(4)
        : (parseFloat(ri.batchQuantity) / recipe.batchYield).toFixed(4);
      return {
        productId,
        ingredientId: ri.ingredientId,
        quantityPerUnit: qty,
        unit: useGrams ? "g" : ri.unit,
        sortOrder: i * 10,
      };
    })
  );
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export async function createRecipeAction(productId: string, formData: FormData) {
  await requireAdmin();

  const name = s(formData.get("name")) || "Standard Batch";
  const batchYield = int(formData.get("batchYield"));
  if (!batchYield) return;

  const existing = await db.query.productRecipes.findMany({
    where: (t, { eq }) => eq(t.productId, productId),
    columns: { id: true },
  });
  const isFirst = existing.length === 0;

  const [recipe] = await db
    .insert(productRecipes)
    .values({
      productId,
      name,
      batchYield,
      bakeTemp: int(formData.get("bakeTemp")),
      bakeTimeMin: int(formData.get("bakeTimeMin")),
      bakeTimeMax: int(formData.get("bakeTimeMax")),
      scoopSize: s(formData.get("scoopSize")) || null,
      cookiesPerPan: int(formData.get("cookiesPerPan")),
      directions: s(formData.get("directions")) || null,
      notes: s(formData.get("notes")) || null,
      isDefault: isFirst,
      sortOrder: existing.length * 10,
    })
    .returning();

  revalidatePath(`/admin/cookbook/${productId}`);
  redirect(`/admin/cookbook/${productId}/${recipe.id}`);
}

export async function updateRecipeAction(recipeId: string, productId: string, formData: FormData) {
  await requireAdmin();

  const batchYield = int(formData.get("batchYield"));
  if (!batchYield) return;

  await db
    .update(productRecipes)
    .set({
      name: s(formData.get("name")) || "Standard Batch",
      batchYield,
      bakeTemp: int(formData.get("bakeTemp")),
      bakeTimeMin: int(formData.get("bakeTimeMin")),
      bakeTimeMax: int(formData.get("bakeTimeMax")),
      scoopSize: s(formData.get("scoopSize")) || null,
      cookiesPerPan: int(formData.get("cookiesPerPan")),
      directions: s(formData.get("directions")) || null,
      notes: s(formData.get("notes")) || null,
    })
    .where(eq(productRecipes.id, recipeId));

  const recipe = await db.query.productRecipes.findFirst({
    where: (t, { eq }) => eq(t.id, recipeId),
    columns: { isDefault: true },
  });
  if (recipe?.isDefault) await syncProductIngredients(recipeId, productId);

  revalidatePath(`/admin/cookbook/${productId}`);
  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
}

export async function deleteRecipeAction(recipeId: string, productId: string) {
  await requireAdmin();

  const recipe = await db.query.productRecipes.findFirst({
    where: (t, { eq }) => eq(t.id, recipeId),
    columns: { isDefault: true, sortOrder: true },
  });

  await db.delete(productRecipes).where(eq(productRecipes.id, recipeId));

  // If we deleted the default, promote the next recipe
  if (recipe?.isDefault) {
    const next = await db.query.productRecipes.findFirst({
      where: (t, { eq }) => eq(t.productId, productId),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    });
    if (next) {
      await db
        .update(productRecipes)
        .set({ isDefault: true })
        .where(eq(productRecipes.id, next.id));
      await syncProductIngredients(next.id, productId);
    } else {
      // No recipes left — clear product ingredients
      await db.delete(productIngredients).where(eq(productIngredients.productId, productId));
    }
  }

  revalidatePath(`/admin/cookbook/${productId}`);
  redirect(`/admin/cookbook/${productId}`);
}

export async function setDefaultRecipeAction(recipeId: string, productId: string) {
  await requireAdmin();

  // Clear existing default
  await db
    .update(productRecipes)
    .set({ isDefault: false })
    .where(eq(productRecipes.productId, productId));

  // Set new default
  await db
    .update(productRecipes)
    .set({ isDefault: true })
    .where(eq(productRecipes.id, recipeId));

  await syncProductIngredients(recipeId, productId);

  revalidatePath(`/admin/cookbook/${productId}`);
  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
}

// ---------------------------------------------------------------------------
// Recipe ingredients
// ---------------------------------------------------------------------------

export async function addRecipeIngredientAction({
  recipeId,
  productId,
  ingredientId,
  batchQuantity,
  unit,
  batchQuantityGrams,
  notes,
  sortOrder,
}: {
  recipeId: string;
  productId: string;
  ingredientId: string;
  batchQuantity: string;
  unit: string;
  batchQuantityGrams?: string;
  notes?: string;
  sortOrder: number;
}) {
  await requireAdmin();

  const [row] = await db
    .insert(recipeIngredients)
    .values({
      recipeId,
      ingredientId,
      batchQuantity,
      unit,
      batchQuantityGrams: batchQuantityGrams || null,
      notes: notes || null,
      sortOrder,
    })
    .returning();

  const ing = await db.query.ingredients.findFirst({
    where: (t, { eq }) => eq(t.id, ingredientId),
  });

  const recipe = await db.query.productRecipes.findFirst({
    where: (t, { eq }) => eq(t.id, recipeId),
    columns: { isDefault: true },
  });
  if (recipe?.isDefault) await syncProductIngredients(recipeId, productId);

  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
  return { ...row, ingredient: ing! };
}

export async function updateRecipeIngredientAction(
  id: string,
  recipeId: string,
  productId: string,
  payload: {
    batchQuantity: string;
    unit: string;
    batchQuantityGrams?: string;
    notes?: string;
  }
) {
  await requireAdmin();

  await db
    .update(recipeIngredients)
    .set({
      batchQuantity: payload.batchQuantity,
      unit: payload.unit,
      batchQuantityGrams: payload.batchQuantityGrams || null,
      notes: payload.notes || null,
    })
    .where(eq(recipeIngredients.id, id));

  const recipe = await db.query.productRecipes.findFirst({
    where: (t, { eq }) => eq(t.id, recipeId),
    columns: { isDefault: true },
  });
  if (recipe?.isDefault) await syncProductIngredients(recipeId, productId);

  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
}

export async function removeRecipeIngredientAction(
  id: string,
  recipeId: string,
  productId: string
) {
  await requireAdmin();

  await db.delete(recipeIngredients).where(eq(recipeIngredients.id, id));

  const recipe = await db.query.productRecipes.findFirst({
    where: (t, { eq }) => eq(t.id, recipeId),
    columns: { isDefault: true },
  });
  if (recipe?.isDefault) await syncProductIngredients(recipeId, productId);

  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
}

export async function reorderRecipeIngredientsAction(
  recipeId: string,
  productId: string,
  orderedIds: string[]
) {
  await requireAdmin();

  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(recipeIngredients)
      .set({ sortOrder: i * 10 })
      .where(
        and(
          eq(recipeIngredients.id, orderedIds[i]),
          eq(recipeIngredients.recipeId, recipeId)
        )
      );
  }

  const recipe = await db.query.productRecipes.findFirst({
    where: (t, { eq }) => eq(t.id, recipeId),
    columns: { isDefault: true },
  });
  if (recipe?.isDefault) await syncProductIngredients(recipeId, productId);

  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
}

// ---------------------------------------------------------------------------
// Recipe steps
// ---------------------------------------------------------------------------

export async function addRecipeStepAction(recipeId: string, productId: string, content: string, sortOrder: number) {
  await requireAdmin();
  const [row] = await db
    .insert(recipeSteps)
    .values({ recipeId, content, sortOrder })
    .returning();
  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
  return row;
}

export async function updateRecipeStepAction(id: string, productId: string, recipeId: string, content: string) {
  await requireAdmin();
  await db.update(recipeSteps).set({ content }).where(eq(recipeSteps.id, id));
  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
}

export async function deleteRecipeStepAction(id: string, productId: string, recipeId: string) {
  await requireAdmin();
  await db.delete(recipeSteps).where(eq(recipeSteps.id, id));
  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
}

export async function reorderRecipeStepsAction(recipeId: string, productId: string, orderedIds: string[]) {
  await requireAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(recipeSteps)
      .set({ sortOrder: i * 10 })
      .where(and(eq(recipeSteps.id, orderedIds[i]), eq(recipeSteps.recipeId, recipeId)));
  }
  revalidatePath(`/admin/cookbook/${productId}/${recipeId}`);
}
