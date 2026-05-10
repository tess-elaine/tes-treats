// Cost calculation helpers for cookbook recipes.
// All money in cents (integers). Returns null when cost data is unavailable.

export type RecipeIngredientWithCost = {
  batchQuantity: string;
  unit: string;
  batchQuantityGrams: string | null;
  ingredient: {
    purchaseCostCents: number | null;
    purchaseQuantity: string | null;
    purchaseUnit: string | null;
  };
};

export function calcIngredientBatchCostCents(ri: RecipeIngredientWithCost): number | null {
  const { purchaseCostCents, purchaseQuantity, purchaseUnit } = ri.ingredient;
  if (purchaseCostCents == null || purchaseQuantity == null || purchaseUnit == null) return null;

  const costPerPkgUnit = purchaseCostCents / parseFloat(purchaseQuantity);

  // Prefer gram weight when available and ingredient is priced by gram
  if (ri.batchQuantityGrams && purchaseUnit === "g") {
    return Math.round(parseFloat(ri.batchQuantityGrams) * costPerPkgUnit);
  }

  // Direct unit match
  if (ri.unit === purchaseUnit) {
    return Math.round(parseFloat(ri.batchQuantity) * costPerPkgUnit);
  }

  return null; // units incompatible — show "—" in UI
}

export function calcTotalBatchCostCents(
  ris: RecipeIngredientWithCost[]
): number | null {
  let total = 0;
  for (const ri of ris) {
    const cost = calcIngredientBatchCostCents(ri);
    if (cost == null) return null; // any unknown = total unknown
    total += cost;
  }
  return total;
}
