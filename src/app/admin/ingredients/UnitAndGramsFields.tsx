"use client";

import { useState } from "react";

const COMMON_UNITS = ["cup", "tbsp", "tsp", "oz", "g", "lb", "each", "pinch", "stick"];

export function UnitAndGramsFields({
  initialUnit = "cup",
  initialGrams = "",
}: {
  initialUnit?: string;
  initialGrams?: string;
}) {
  const [unit, setUnit] = useState(initialUnit);

  function handleUnitChange(next: string) {
    setUnit(next);
  }

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
    </>
  );
}
