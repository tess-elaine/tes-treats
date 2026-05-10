"use client";

import { useState } from "react";

const COMMON_UNITS = ["cup", "tbsp", "tsp", "oz", "g", "lb", "each", "pinch", "stick"];

// Purchase units that are meaningful for each default unit.
// Weight units are always cross-compatible (g/oz/lb).
// Volume units are cross-compatible (cup/tbsp/tsp), plus weight when gramsPerUnit is set.
// Count units only match count-like purchase formats.
const COMPATIBLE_PURCHASE_UNITS: Record<string, string[]> = {
  g:     ["g", "oz", "lb"],
  oz:    ["oz", "g", "lb"],
  lb:    ["lb", "oz", "g"],
  cup:   ["cup", "tbsp", "tsp", "g", "oz", "lb"],
  tbsp:  ["tbsp", "tsp", "cup", "g", "oz", "lb"],
  tsp:   ["tsp", "tbsp", "cup", "g", "oz", "lb"],
  each:  ["each", "can", "package"],
  stick: ["stick", "each", "g", "oz", "lb"],
  pinch: ["tsp", "tbsp", "cup"],
};

function compatibleFor(unit: string): string[] {
  return COMPATIBLE_PURCHASE_UNITS[unit] ?? ["g", "oz", "lb", "each", "cup", "tbsp", "tsp"];
}

function bestPurchaseUnit(defaultUnit: string, current: string): string {
  const compat = compatibleFor(defaultUnit);
  if (current && compat.includes(current)) return current;
  return compat.includes(defaultUnit) ? defaultUnit : (compat[0] ?? "");
}

export function UnitAndGramsFields({
  initialUnit = "cup",
  initialGrams = "",
  initialPurchaseUnit = "",
  initialPurchaseCost = "",
  initialPurchaseQuantity = "",
}: {
  initialUnit?: string;
  initialGrams?: string;
  initialPurchaseUnit?: string;
  initialPurchaseCost?: string;
  initialPurchaseQuantity?: string;
}) {
  const [unit, setUnit] = useState(initialUnit);
  const [purchaseUnit, setPurchaseUnit] = useState(
    () => bestPurchaseUnit(initialUnit, initialPurchaseUnit)
  );

  function handleUnitChange(next: string) {
    setUnit(next);
    setPurchaseUnit(bestPurchaseUnit(next, purchaseUnit));
  }

  const compat = compatibleFor(unit);

  return (
    <>
      <div>
        <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-2">
          Default unit
        </label>
        <select
          name="defaultUnit"
          value={unit}
          onChange={(e) => handleUnitChange(e.target.value)}
          className="ghost-border rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
        >
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {unit !== "g" && (
        <div>
          <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
            Grams per {unit}
          </label>
          <input
            key={unit}
            name="gramsPerUnit"
            type="number"
            min="0"
            step="any"
            placeholder="125"
            defaultValue={unit === initialUnit ? initialGrams : ""}
            className="ghost-border w-40 rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
          />
          <p className="mt-1 text-xs text-on-surface-variant/60">
            How many grams in 1 {unit}. Auto-fills gram weight in recipes when you enter in {unit}s.
          </p>
        </div>
      )}

      <div>
        <p className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-3">
          Purchase cost (for recipe costing)
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Cost ($)</label>
            <input
              name="purchaseCostDollars"
              type="number"
              min="0"
              step="0.01"
              placeholder="3.79"
              defaultValue={initialPurchaseCost}
              className="ghost-border h-10 w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Pkg size</label>
            <input
              name="purchaseQuantity"
              type="number"
              min="0"
              step="any"
              placeholder="2270"
              defaultValue={initialPurchaseQuantity}
              className="ghost-border h-10 w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Pkg unit</label>
            <select
              name="purchaseUnit"
              value={purchaseUnit}
              onChange={(e) => setPurchaseUnit(e.target.value)}
              className="ghost-border h-10 w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            >
              <option value="">—</option>
              {compat.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant/60">
          Used to auto-calculate ingredient cost in cookbook recipes.
        </p>
      </div>
    </>
  );
}
