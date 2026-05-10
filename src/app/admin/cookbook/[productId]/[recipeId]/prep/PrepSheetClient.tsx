"use client";

import { useState } from "react";
import Link from "next/link";

type Ingredient = {
  id: string;
  name: string;
  batchQuantity: string;
  unit: string;
  batchQuantityGrams: string | null;
  notes: string | null;
};

type Recipe = {
  name: string;
  batchYield: number;
  bakeTemp: number | null;
  bakeTimeMin: number | null;
  bakeTimeMax: number | null;
  scoopSize: string | null;
  cookiesPerPan: number | null;
  directions: string | null;
  notes: string | null;
  ingredients: Ingredient[];
};

const MULTIPLIERS = [1, 2, 3] as const;

function fmt(n: number) {
  // Display as a friendly fraction string for common baking quantities
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 1000) / 1000;
  return rounded.toString();
}

export function PrepSheetClient({
  product,
  recipe,
  backHref,
}: {
  product: { name: string };
  recipe: Recipe;
  backHref: string;
}) {
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);

  const scaledYield = recipe.batchYield * multiplier;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          body { font-size: 12pt; }
          .prep-sheet { max-width: none !important; padding: 0 !important; }
        }
      `}</style>

      {/* Top bar — hidden on print */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href={backHref}
          className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
        >
          ← Back to recipe
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            Batch size:
          </span>
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMultiplier(m)}
              className={[
                "rounded-full px-3 py-1 font-label text-xs font-semibold transition-colors",
                multiplier === m
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface hover:bg-primary/10",
              ].join(" ")}
            >
              {m}×
            </button>
          ))}
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-2 rounded-md bg-surface-container-high px-3 py-1.5 font-label text-xs uppercase tracking-[0.12em] text-on-surface hover:bg-primary/10"
          >
            Print
          </button>
        </div>
      </div>

      {/* Prep sheet body */}
      <div className="prep-sheet max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant">
            TES Treats — Prep Sheet
          </p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold text-primary">
            {product.name}
          </h1>
          <p className="mt-0.5 font-headline text-lg text-on-surface-variant">
            {recipe.name}
            {multiplier > 1 && (
              <span className="ml-2 text-sm text-on-surface-variant/60">({multiplier}× batch)</span>
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-on-surface-variant">
            <span>
              <strong className="text-on-surface">Yield:</strong> {scaledYield} cookies
              {scaledYield >= 12 && (
                <span className="ml-1 text-on-surface-variant/60">
                  ({(scaledYield / 12).toFixed(2)} dozen)
                </span>
              )}
            </span>
            {recipe.bakeTemp && (
              <span>
                <strong className="text-on-surface">Bake:</strong> {recipe.bakeTemp}°F
                {recipe.bakeTimeMin && recipe.bakeTimeMax
                  ? ` · ${recipe.bakeTimeMin}–${recipe.bakeTimeMax} min`
                  : recipe.bakeTimeMin
                  ? ` · ${recipe.bakeTimeMin} min`
                  : ""}
              </span>
            )}
            {recipe.scoopSize && (
              <span>
                <strong className="text-on-surface">Scoop:</strong> {recipe.scoopSize}
              </span>
            )}
            {recipe.cookiesPerPan && (
              <span>
                <strong className="text-on-surface">Per pan:</strong> {recipe.cookiesPerPan}
              </span>
            )}
          </div>
        </div>

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface border-b border-outline-variant pb-2">
              Ingredients
            </h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="pb-2 pr-4 font-medium">Ingredient</th>
                  <th className="pb-2 pr-4 font-medium text-right">Qty</th>
                  <th className="pb-2 pr-4 font-medium text-right">Grams</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {recipe.ingredients.map((ing) => {
                  const scaledQty = fmt(parseFloat(ing.batchQuantity) * multiplier);
                  const scaledGrams =
                    ing.batchQuantityGrams != null
                      ? fmt(parseFloat(ing.batchQuantityGrams) * multiplier)
                      : null;
                  return (
                    <tr key={ing.id}>
                      <td className="py-2 pr-4 font-medium text-on-surface">{ing.name}</td>
                      <td className="py-2 pr-4 text-right text-on-surface-variant whitespace-nowrap">
                        {scaledQty} {ing.unit}
                      </td>
                      <td className="py-2 pr-4 text-right text-on-surface-variant">
                        {scaledGrams != null ? `${scaledGrams}g` : ""}
                      </td>
                      <td className="py-2 text-on-surface-variant/70 italic text-xs">
                        {ing.notes ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Directions */}
        {recipe.directions && (
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface border-b border-outline-variant pb-2">
              Directions
            </h2>
            <div className="mt-3 whitespace-pre-wrap font-body text-sm leading-relaxed text-on-surface">
              {recipe.directions}
            </div>
          </div>
        )}

        {/* Notes */}
        {recipe.notes && (
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface border-b border-outline-variant pb-2">
              Notes
            </h2>
            <div className="mt-3 whitespace-pre-wrap font-body text-sm leading-relaxed text-on-surface-variant">
              {recipe.notes}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
