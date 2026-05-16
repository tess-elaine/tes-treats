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
    defaultUnit?: string | null;
    gramsPerUnit?: string | null;
  };
};

// ---------------------------------------------------------------------------
// Unit conversion tables
// ---------------------------------------------------------------------------

// Factors relative to 1 tsp (volume base)
const VOLUME_TO_TSP: Record<string, number> = {
  tsp: 1, teaspoon: 1, teaspoons: 1,
  tbsp: 3, tablespoon: 3, tablespoons: 3,
  "fl oz": 6, floz: 6,
  cup: 48, cups: 48,
  pint: 384, pt: 384,
  quart: 768, qt: 768,
  gallon: 3072,
  ml: 0.202884, milliliter: 0.202884, millilitre: 0.202884,
  l: 202.884, liter: 202.884, litre: 202.884,
};

// Factors relative to 1 g (weight base)
const WEIGHT_TO_G: Record<string, number> = {
  g: 1, gram: 1, grams: 1,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
  kg: 1000, kilogram: 1000, kilograms: 1000,
};

// Ordered baker-friendly unit lists for recipe dropdowns.
export const BAKER_VOLUME_UNITS = ["tsp", "tbsp", "fl oz", "cup"] as const;
export const BAKER_WEIGHT_UNITS = ["g", "oz", "lb"] as const;

// Returns the units a recipe ingredient can use, given its ingredient's defaultUnit.
export function compatibleRecipeUnits(defaultUnit: string): string[] {
  const d = defaultUnit.toLowerCase().trim();
  if (d in VOLUME_TO_TSP) return [...BAKER_VOLUME_UNITS];
  if (d in WEIGHT_TO_G) return [...BAKER_WEIGHT_UNITS];
  return [defaultUnit]; // each, pinch, stick — no conversion
}

function n(u: string) {
  return u.toLowerCase().trim();
}

// Convert qty from `from` unit to `to` unit within the same type.
// Returns null if units are incompatible or unknown.
export function convertUnits(qty: number, from: string, to: string): number | null {
  const f = n(from);
  const t = n(to);
  if (f === t) return qty;

  const fV = VOLUME_TO_TSP[f];
  const tV = VOLUME_TO_TSP[t];
  if (fV != null && tV != null) return (qty * fV) / tV;

  const fW = WEIGHT_TO_G[f];
  const tW = WEIGHT_TO_G[t];
  if (fW != null && tW != null) return (qty * fW) / tW;

  return null;
}

// Convert qty grams to `to` unit (must be a weight unit).
function gramsToUnit(grams: number, to: string): number | null {
  const factor = WEIGHT_TO_G[n(to)];
  return factor != null ? grams / factor : null;
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

export function calcIngredientBatchCostCents(ri: RecipeIngredientWithCost): number | null {
  const { purchaseCostCents, purchaseQuantity, purchaseUnit } = ri.ingredient;
  if (purchaseCostCents == null || !purchaseQuantity || !purchaseUnit) return null;

  const pkgQty = parseFloat(purchaseQuantity);
  if (!isFinite(pkgQty) || pkgQty <= 0) return null;

  const costPerPkgUnit = purchaseCostCents / pkgQty;
  const batchQty = parseFloat(ri.batchQuantity);
  if (!isFinite(batchQty)) return null;

  // 1. Same unit or same-type unit conversion (volume↔volume or weight↔weight)
  const converted = convertUnits(batchQty, ri.unit, purchaseUnit);
  if (converted != null) return Math.round(converted * costPerPkgUnit);

  // 2. Explicit gram weight + weight purchase unit
  //    (recipe measured in volume but gram weight was entered)
  if (ri.batchQuantityGrams) {
    const grams = parseFloat(ri.batchQuantityGrams);
    if (isFinite(grams) && grams > 0) {
      const inPkgUnit = gramsToUnit(grams, purchaseUnit);
      if (inPkgUnit != null) return Math.round(inPkgUnit * costPerPkgUnit);
    }
  }

  // 3. gramsPerUnit bridge: recipe unit → grams → purchase unit (weight)
  //    Handles: cup of butter (227g/cup) → lb, tsp of salt (6g/tsp) → oz, etc.
  const { gramsPerUnit, defaultUnit } = ri.ingredient;
  if (gramsPerUnit && defaultUnit) {
    const gpu = parseFloat(gramsPerUnit);
    if (isFinite(gpu) && gpu > 0) {
      // Get recipe qty in terms of defaultUnit
      const qtyInDefault = convertUnits(batchQty, ri.unit, defaultUnit);
      if (qtyInDefault != null) {
        const grams = qtyInDefault * gpu;
        const inPkgUnit = gramsToUnit(grams, purchaseUnit);
        if (inPkgUnit != null) return Math.round(inPkgUnit * costPerPkgUnit);
      }
    }
  }

  return null; // truly incompatible units — show "—" in UI
}

export function calcTotalBatchCostCents(
  ris: RecipeIngredientWithCost[]
): number | null {
  let total = 0;
  for (const ri of ris) {
    const cost = calcIngredientBatchCostCents(ri);
    if (cost == null) return null;
    total += cost;
  }
  return total;
}
