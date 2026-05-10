"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { formatCents } from "@/lib/format";
import { calcIngredientBatchCostCents, calcTotalBatchCostCents } from "@/lib/cookbook";
import {
  addRecipeIngredientAction,
  removeRecipeIngredientAction,
  reorderRecipeIngredientsAction,
  setDefaultRecipeAction,
} from "../../actions";
import { searchIngredientsAction } from "@/app/admin/ingredients/actions";

type IngredientRef = {
  id: string;
  name: string;
  defaultUnit: string;
  purchaseCostCents: number | null;
  purchaseQuantity: string | null;
  purchaseUnit: string | null;
  gramsPerUnit: string | null;
};

type RecipeIngredient = {
  id: string;
  batchQuantity: string;
  unit: string;
  batchQuantityGrams: string | null;
  notes: string | null;
  sortOrder: number;
  ingredient: IngredientRef;
};

export function RecipeIngredientsClient({
  recipeId,
  productId,
  batchYield,
  isDefault,
  initialIngredients,
}: {
  recipeId: string;
  productId: string;
  batchYield: number;
  isDefault: boolean;
  initialIngredients: RecipeIngredient[];
}) {
  const [list, setList] = useState<RecipeIngredient[]>(initialIngredients);
  const [isPending, startTransition] = useTransition();

  // Search / add state
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<IngredientRef[]>([]);
  const [selected, setSelected] = useState<IngredientRef | null>(null);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [grams, setGrams] = useState("");
  const [ingNotes, setIngNotes] = useState("");

  // Drag-and-drop
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const r = await searchIngredientsAction(q);
    setResults(r.map((x) => ({
      ...x,
      purchaseCostCents: null,
      purchaseQuantity: null,
      purchaseUnit: null,
    })));
  }, []);

  // Auto-fill grams when qty/unit matches the ingredient's defaultUnit
  function autoFillGrams(qtyStr: string, unitStr: string, ing: IngredientRef | null) {
    if (!ing?.gramsPerUnit || !ing?.defaultUnit) return;
    const norm = (u: string) => u.toLowerCase().trim();
    if (norm(unitStr) !== norm(ing.defaultUnit)) return;
    if (norm(unitStr) === "g") return;
    const qtyNum = parseFloat(qtyStr);
    if (!isNaN(qtyNum)) {
      setGrams(String(Math.round(qtyNum * parseFloat(ing.gramsPerUnit))));
    }
  }

  function resetAdd() {
    setSelected(null);
    setQty("");
    setUnit("");
    setGrams("");
    setIngNotes("");
    setSearch("");
    setResults([]);
  }

  const totalCostCents = calcTotalBatchCostCents(list);
  const costPerCookieCents = totalCostCents != null ? totalCostCents / batchYield : null;
  const costPerDozenCents = costPerCookieCents != null ? Math.round(costPerCookieCents * 12) : null;

  return (
    <NibbleCard bite="none" className="p-6 md:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-headline text-lg font-bold text-primary">Ingredients</h2>
        <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
          batch of {batchYield} cookies
        </span>
      </div>

      {/* Ingredient rows */}
      {list.length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-[1.5rem_1fr_auto_auto_1.5rem] gap-x-2 gap-y-0 mb-1 px-1">
            <span />
            <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Ingredient</span>
            <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant text-right">Batch qty</span>
            <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant text-right">Cost</span>
            <span />
          </div>
          <ul className="divide-y divide-outline-variant/30">
            {list.map((ri, idx) => {
              const cost = calcIngredientBatchCostCents(ri);
              const perCookie = cost != null ? cost / batchYield : null;
              return (
                <li
                  key={ri.id}
                  draggable
                  onDragStart={() => { dragIdx.current = idx; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragIdx.current;
                    if (from === null || from === idx) { setDragOverIdx(null); return; }
                    const next = [...list];
                    const [removed] = next.splice(from, 1);
                    next.splice(idx, 0, removed);
                    setList(next);
                    dragIdx.current = null;
                    setDragOverIdx(null);
                    startTransition(async () => {
                      await reorderRecipeIngredientsAction(recipeId, productId, next.map((r) => r.id));
                    });
                  }}
                  onDragEnd={() => { setDragOverIdx(null); dragIdx.current = null; }}
                  className={[
                    "grid grid-cols-[1.5rem_1fr_auto_auto_1.5rem] items-center gap-x-2 py-2 transition-colors",
                    dragOverIdx === idx ? "bg-primary-fixed/40" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <span className="select-none cursor-grab text-on-surface-variant/30 text-lg leading-none">⠿</span>
                  <div className="min-w-0">
                    <span className="block font-medium text-on-surface truncate">{ri.ingredient.name}</span>
                    {ri.notes && (
                      <span className="block text-xs text-on-surface-variant/60 italic">{ri.notes}</span>
                    )}
                  </div>
                  <div className="text-right text-sm text-on-surface-variant whitespace-nowrap">
                    <span>{ri.batchQuantity} {ri.unit}</span>
                    {ri.batchQuantityGrams && (
                      <span className="ml-1 text-xs text-on-surface-variant/50">({ri.batchQuantityGrams}g)</span>
                    )}
                    {perCookie != null && (
                      <span className="ml-1 text-xs text-on-surface-variant/50">
                        = {(perCookie / 100).toFixed(4)}/cookie
                      </span>
                    )}
                  </div>
                  <div className="text-right text-sm font-medium text-on-surface whitespace-nowrap">
                    {cost != null ? formatCents(cost) : <span className="text-on-surface-variant/40">—</span>}
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(async () => {
                      await removeRecipeIngredientAction(ri.id, recipeId, productId);
                      setList((l) => l.filter((x) => x.id !== ri.id));
                    })}
                    className="text-on-surface-variant/30 hover:text-on-error-container transition-colors disabled:opacity-40"
                    aria-label="Remove"
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Cost summary */}
          <div className="mt-3 border-t border-outline-variant/40 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Total batch cost</span>
              <span className="font-semibold text-on-surface">
                {totalCostCents != null ? formatCents(totalCostCents) : <span className="text-on-surface-variant/40">—</span>}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Cost per cookie</span>
              <span className="font-semibold text-on-surface">
                {costPerCookieCents != null ? formatCents(Math.round(costPerCookieCents)) : <span className="text-on-surface-variant/40">—</span>}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant font-medium">Cost per dozen</span>
              <span className="font-bold text-primary">
                {costPerDozenCents != null ? formatCents(costPerDozenCents) : <span className="text-on-surface-variant/40">—</span>}
              </span>
            </div>
            {totalCostCents == null && list.some((ri) => calcIngredientBatchCostCents(ri) == null) && (
              <p className="text-xs text-on-surface-variant/50 italic">
                Some ingredients are missing purchase cost — add cost info in the{" "}
                <a href="/admin/ingredients" className="underline hover:text-primary">ingredient library</a>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add ingredient */}
      <div className="mt-5 space-y-3">
        <p className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
          Add ingredient
        </p>

        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary-fixed px-3 py-1.5 text-sm font-medium text-on-surface">
                {selected.name}
              </span>
              <button
                type="button"
                onClick={resetAdd}
                className="text-xs text-on-surface-variant hover:text-primary"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <label className="block text-xs text-on-surface-variant mb-1">Qty *</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="2"
                  value={qty}
                  onChange={(e) => { setQty(e.target.value); autoFillGrams(e.target.value, unit, selected); }}
                  className="ghost-border w-full rounded-md bg-surface-container-high px-2 py-1.5 text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Unit *</label>
                <input
                  type="text"
                  placeholder="cup"
                  value={unit}
                  onChange={(e) => { setUnit(e.target.value); autoFillGrams(qty, e.target.value, selected); }}
                  className="ghost-border w-full rounded-md bg-surface-container-high px-2 py-1.5 text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">
                  Grams
                  {selected?.gramsPerUnit && unit.toLowerCase().trim() === selected.defaultUnit.toLowerCase().trim() && unit.toLowerCase().trim() !== "g" ? (
                    <span className="ml-1 text-primary/60">(auto)</span>
                  ) : (
                    <span className="opacity-50"> (opt)</span>
                  )}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="250"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  className="ghost-border w-full rounded-md bg-surface-container-high px-2 py-1.5 text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">
                  Note <span className="opacity-50">(opt)</span>
                </label>
                <input
                  type="text"
                  placeholder="softened"
                  value={ingNotes}
                  onChange={(e) => setIngNotes(e.target.value)}
                  className="ghost-border w-full rounded-md bg-surface-container-high px-2 py-1.5 text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-on-surface-variant/60">
              Enter grams if the ingredient is priced by weight (g) but measured in another unit — used for accurate cost calculation.
            </p>
            <div className="flex gap-2">
              <BiteButton
                type="button"
                size="md"
                disabled={isPending || !qty || !unit}
                biteColor="var(--color-surface-container-lowest)"
                onClick={() => startTransition(async () => {
                  if (!selected || !qty || !unit) return;
                  const row = await addRecipeIngredientAction({
                    recipeId,
                    productId,
                    ingredientId: selected.id,
                    batchQuantity: qty,
                    unit,
                    batchQuantityGrams: grams || undefined,
                    notes: ingNotes || undefined,
                    sortOrder: list.length * 10,
                  });
                  if (row) {
                    setList((l) => [...l, {
                      id: row.id,
                      batchQuantity: row.batchQuantity,
                      unit: row.unit,
                      batchQuantityGrams: row.batchQuantityGrams ?? null,
                      notes: row.notes ?? null,
                      sortOrder: row.sortOrder,
                      ingredient: {
                        id: row.ingredient.id,
                        name: row.ingredient.name,
                        defaultUnit: row.ingredient.defaultUnit,
                        purchaseCostCents: row.ingredient.purchaseCostCents,
                        purchaseQuantity: row.ingredient.purchaseQuantity,
                        purchaseUnit: row.ingredient.purchaseUnit,
                        gramsPerUnit: row.ingredient.gramsPerUnit ?? null,
                      },
                    }]);
                  }
                  resetAdd();
                })}
              >
                {isPending ? "Adding…" : "Add"}
              </BiteButton>
              <BiteButton type="button" size="md" variant="ghost" onClick={resetAdd}>
                Cancel
              </BiteButton>
            </div>
          </div>
        ) : (
          <div className="relative max-w-xs">
            <input
              type="text"
              placeholder="Search ingredients…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); doSearch(e.target.value); }}
              className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-md border border-outline-variant bg-surface-container-lowest shadow-lg">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setUnit(r.defaultUnit);
                        setSearch("");
                        setResults([]);
                        // Auto-fill grams if qty already entered and unit is cups
                        if (qty) autoFillGrams(qty, r.defaultUnit, r);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-low"
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="text-xs text-on-surface-variant">
          Don&rsquo;t see it?{" "}
          <a href="/admin/ingredients/new" target="_blank" className="text-primary hover:underline">
            Add to ingredient library ↗
          </a>
        </p>
      </div>

      {/* Set as default */}
      {!isDefault && (
        <div className="mt-6 border-t border-outline-variant/30 pt-4">
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(async () => {
              await setDefaultRecipeAction(recipeId, productId);
            })}
            className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline disabled:opacity-40"
          >
            Set as default recipe
          </button>
          <p className="mt-1 text-xs text-on-surface-variant/60">
            The default recipe&apos;s per-cookie quantities are used for allergen display on the public site.
          </p>
        </div>
      )}
    </NibbleCard>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 4 13 4" />
      <path d="M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4" />
      <path d="M4 4l.8 9.2A.5.5 0 0 0 5.3 14h5.4a.5.5 0 0 0 .5-.8L12 4" />
    </svg>
  );
}
