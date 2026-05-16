"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ingredients, productIngredients } from "@/db/schema/catalog";
import { requireAdmin } from "@/lib/auth-helpers";
import { ALLERGEN_KEYS, type AllergenKey } from "@/lib/allergens";

function s(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

export async function createIngredientAction(formData: FormData) {
  await requireAdmin();
  const name = s(formData.get("name"));
  if (!name) return;

  const allergens = ALLERGEN_KEYS.filter(
    (k) => formData.get(`allergen_${k}`) === "on"
  ) as AllergenKey[];

  const purchaseCostRaw = s(formData.get("purchaseCostDollars"));
  const purchaseQuantityRaw = s(formData.get("purchaseQuantity"));
  const purchaseUnit = s(formData.get("purchaseUnit")) || null;
  const gramsPerUnitRaw = s(formData.get("gramsPerUnit"));

  await db.insert(ingredients).values({
    name,
    allergens,
    defaultUnit: s(formData.get("defaultUnit")) || "cup",
    purchaseCostCents: purchaseCostRaw ? Math.round(parseFloat(purchaseCostRaw) * 100) : null,
    purchaseQuantity: purchaseQuantityRaw || null,
    purchaseUnit,
    gramsPerUnit: gramsPerUnitRaw || null,
  });

  revalidatePath("/admin/ingredients");
  redirect("/admin/ingredients");
}

export async function updateIngredientAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;

  const allergens = ALLERGEN_KEYS.filter(
    (k) => formData.get(`allergen_${k}`) === "on"
  ) as AllergenKey[];

  const purchaseCostRaw = s(formData.get("purchaseCostDollars"));
  const purchaseQuantityRaw = s(formData.get("purchaseQuantity"));
  const purchaseUnit = s(formData.get("purchaseUnit")) || null;
  const gramsPerUnitRaw = s(formData.get("gramsPerUnit"));

  await db
    .update(ingredients)
    .set({
      name: s(formData.get("name")),
      allergens,
      defaultUnit: s(formData.get("defaultUnit")) || "cup",
      purchaseCostCents: purchaseCostRaw ? Math.round(parseFloat(purchaseCostRaw) * 100) : null,
      purchaseQuantity: purchaseQuantityRaw || null,
      purchaseUnit,
      gramsPerUnit: gramsPerUnitRaw || null,
    })
    .where(eq(ingredients.id, id));

  revalidatePath("/admin/ingredients");
  redirect("/admin/ingredients");
}

/** Save ingredient edits without redirecting — used by IngredientEditClient save bar. */
export async function saveIngredientAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;

  const allergens = ALLERGEN_KEYS.filter(
    (k) => formData.get(`allergen_${k}`) === "on"
  ) as AllergenKey[];

  const purchaseCostRaw = s(formData.get("purchaseCostDollars"));
  const purchaseQuantityRaw = s(formData.get("purchaseQuantity"));
  const purchaseUnit = s(formData.get("purchaseUnit")) || null;
  const gramsPerUnitRaw = s(formData.get("gramsPerUnit"));

  await db
    .update(ingredients)
    .set({
      name: s(formData.get("name")),
      allergens,
      defaultUnit: s(formData.get("defaultUnit")) || "cup",
      purchaseCostCents: purchaseCostRaw ? Math.round(parseFloat(purchaseCostRaw) * 100) : null,
      purchaseQuantity: purchaseQuantityRaw || null,
      purchaseUnit,
      gramsPerUnit: gramsPerUnitRaw || null,
    })
    .where(eq(ingredients.id, id));

  revalidatePath("/admin/ingredients");
  revalidatePath(`/admin/ingredients/${id}/edit`);
}

export async function deleteIngredientAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;

  // Check if any products reference this ingredient
  const usages = await db.query.productIngredients.findFirst({
    where: (t, { eq }) => eq(t.ingredientId, id),
    columns: { id: true },
  });
  if (usages) redirect("/admin/ingredients?error=in-use");

  await db.delete(ingredients).where(eq(ingredients.id, id));
  revalidatePath("/admin/ingredients");
  redirect("/admin/ingredients");
}

export async function searchIngredientsAction(query: string) {
  await requireAdmin();
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const all = await db.query.ingredients.findMany({
    columns: { id: true, name: true, defaultUnit: true, gramsPerUnit: true },
    orderBy: (t, { asc }) => [asc(t.name)],
  });
  return all.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 10);
}

export async function addProductIngredientAction({
  productId,
  ingredientId,
  quantityPerUnit,
  unit,
  sortOrder,
}: {
  productId: string;
  ingredientId: string;
  quantityPerUnit: string;
  unit: string;
  sortOrder: number;
}) {
  await requireAdmin();
  const [row] = await db
    .insert(productIngredients)
    .values({ productId, ingredientId, quantityPerUnit, unit, sortOrder })
    .returning();
  // Return the row with ingredient details for optimistic UI update
  const ing = await db.query.ingredients.findFirst({
    where: (t, { eq }) => eq(t.id, ingredientId),
    columns: { name: true, defaultUnit: true },
  });
  revalidatePath(`/admin/products/${productId}`);
  return { ...row, ingredient: ing! };
}

export async function removeProductIngredientAction(id: string, productId: string) {
  await requireAdmin();
  await db.delete(productIngredients).where(eq(productIngredients.id, id));
  revalidatePath(`/admin/products/${productId}`);
}

export async function reorderProductIngredientsAction(productId: string, orderedIds: string[]) {
  await requireAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(productIngredients)
      .set({ sortOrder: i * 10 })
      .where(eq(productIngredients.id, orderedIds[i]));
  }
  revalidatePath(`/admin/products/${productId}`);
}
