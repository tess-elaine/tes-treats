"use client";

import { useState, useRef, useTransition, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { batchSaveProductAction } from "../actions";
import {
  addProductIngredientAction,
  removeProductIngredientAction,
  reorderProductIngredientsAction,
  searchIngredientsAction,
} from "@/app/admin/ingredients/actions";

type Category = { slug: string; name: string };

type DbVariant = {
  id: string;
  label: string;
  priceCents: number;
  weightOz: number | null;
  unitCount: number | null;
  sortOrder: number;
  isAvailable: boolean;
  isDefault: boolean;
};

type VariantState = {
  id: string;
  isNew?: boolean;
  label: string;
  priceUsd: string;
  weightOz: string;
  unitCount: string;
  sortOrder: number;
  isAvailable: boolean;
  isDefault: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  sortOrder: number;
  ingredientChips: string[] | null;
  isAvailable: boolean;
  isFeatured: boolean;
};

type DbProductIngredient = {
  id: string;
  ingredientId: string;
  quantityPerUnit: string;
  unit: string;
  sortOrder: number;
  ingredient: { name: string; defaultUnit: string };
};

function toState(v: DbVariant): VariantState {
  return {
    id: v.id,
    label: v.label,
    priceUsd: (v.priceCents / 100).toFixed(2),
    weightOz: v.weightOz != null ? String(v.weightOz) : "",
    unitCount: v.unitCount != null ? String(v.unitCount) : "",
    sortOrder: v.sortOrder,
    isAvailable: v.isAvailable,
    isDefault: v.isDefault,
  };
}

let _newId = 0;

export function ProductEditClient({
  product,
  variants: initialVariantData,
  categories,
  currentCategorySlug,
  productIngredients: initialProductIngredients,
}: {
  product: Product;
  variants: DbVariant[];
  categories: Category[];
  currentCategorySlug?: string;
  productIngredients: DbProductIngredient[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Details form — uncontrolled; we track dirtiness and read via FormData on save
  const detailsFormRef = useRef<HTMLFormElement>(null);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [detailsResetKey, setDetailsResetKey] = useState(0);

  // Variants state
  const initialVariants = useMemo(
    () => initialVariantData.map(toState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // intentionally stable — component remounts (key change) after each save
  );
  const [variantList, setVariantList] = useState<VariantState[]>(initialVariants);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [dirtyVariantIds, setDirtyVariantIds] = useState<Set<string>>(new Set());

  // Drag-and-drop
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Ingredient state
  const [ingList, setIngList] = useState<DbProductIngredient[]>(initialProductIngredients);
  const [ingSearch, setIngSearch] = useState("");
  const [ingResults, setIngResults] = useState<{ id: string; name: string; defaultUnit: string }[]>([]);
  const [ingQty, setIngQty] = useState("");
  const [ingUnit, setIngUnit] = useState("");
  const [selectedIng, setSelectedIng] = useState<{ id: string; name: string; defaultUnit: string } | null>(null);
  const [ingPending, startIngTransition] = useTransition();
  const ingDragIdx = useRef<number | null>(null);
  const [ingDragOverIdx, setIngDragOverIdx] = useState<number | null>(null);

  const searchIngredients = useCallback(async (q: string) => {
    if (!q.trim()) { setIngResults([]); return; }
    const results = await searchIngredientsAction(q);
    setIngResults(results);
  }, []);

  // Save status
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Portal mount — avoid SSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Change count — each touched variant ID counted once
  const affectedVariantIds = useMemo(() => {
    const s = new Set<string>([
      ...dirtyVariantIds,
      ...pendingDeletes,
      ...variantList.filter((v) => v.isNew).map((v) => v.id),
    ]);
    return s;
  }, [dirtyVariantIds, pendingDeletes, variantList]);
  const changeCount = (detailsDirty ? 1 : 0) + affectedVariantIds.size;

  // ----- Variant helpers -----

  function markDirty(id: string) {
    if (!id.startsWith("new-")) {
      setDirtyVariantIds((s) => new Set([...s, id]));
    }
    setSaveStatus("idle");
  }

  function updateVariant(id: string, field: keyof VariantState, value: unknown) {
    setVariantList((list) =>
      list.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
    markDirty(id);
  }

  function setDefaultVariant(id: string) {
    setVariantList((list) =>
      list.map((v) => ({ ...v, isDefault: v.id === id }))
    );
    // Mark all formerly-default existing variants as dirty
    variantList.forEach((v) => {
      if (v.isDefault || v.id === id) markDirty(v.id);
    });
  }

  function markDelete(id: string) {
    // If deleting the default, promote the next visible one
    const target = variantList.find((v) => v.id === id);
    if (target?.isDefault) {
      const next = variantList.find(
        (v) => v.id !== id && !pendingDeletes.has(v.id)
      );
      if (next) {
        setVariantList((list) =>
          list.map((v) => ({ ...v, isDefault: v.id === next.id }))
        );
        markDirty(next.id);
      }
    }
    if (target?.isNew) {
      // New unsaved variants can just be removed
      setVariantList((list) => list.filter((v) => v.id !== id));
    } else {
      setPendingDeletes((s) => new Set([...s, id]));
    }
    setSaveStatus("idle");
  }

  function undoDelete(id: string) {
    setPendingDeletes((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setSaveStatus("idle");
  }

  function addVariant() {
    const id = `new-${++_newId}`;
    const maxSort = variantList.reduce((m, v) => Math.max(m, v.sortOrder), 0);
    const isFirst =
      variantList.filter((v) => !pendingDeletes.has(v.id)).length === 0;
    setVariantList((list) => [
      ...list,
      {
        id,
        isNew: true,
        label: "",
        priceUsd: "",
        weightOz: "",
        unitCount: "",
        sortOrder: maxSort + 10,
        isAvailable: true,
        isDefault: isFirst,
      },
    ]);
    setSaveStatus("idle");
  }

  // ----- Drag-and-drop -----

  function handleDragStart(e: React.DragEvent, idx: number) {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  }

  function handleDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) {
      setDragOverIdx(null);
      return;
    }
    const next = [...variantList];
    const [removed] = next.splice(from, 1);
    next.splice(idx, 0, removed);
    const reordered = next.map((v, i) => ({ ...v, sortOrder: i * 10 }));
    setVariantList(reordered);
    // All existing non-deleted variants may have new sort orders
    setDirtyVariantIds(
      new Set(
        reordered
          .filter((v) => !v.isNew && !pendingDeletes.has(v.id))
          .map((v) => v.id)
      )
    );
    setDragOverIdx(null);
    dragIdx.current = null;
    setSaveStatus("idle");
  }

  function handleDragEnd() {
    setDragOverIdx(null);
    dragIdx.current = null;
  }

  // ----- Save / Discard -----

  async function handleSave() {
    if (!detailsFormRef.current) return;
    const fd = new FormData(detailsFormRef.current);
    fd.set("productId", product.id);
    fd.set(
      "variants",
      JSON.stringify(variantList.filter((v) => !pendingDeletes.has(v.id)))
    );
    fd.set("pendingDeletes", JSON.stringify([...pendingDeletes]));

    startTransition(async () => {
      try {
        await batchSaveProductAction(fd);
        setDetailsDirty(false);
        setDirtyVariantIds(new Set());
        setPendingDeletes(new Set());
        setSaveStatus("saved");
        router.refresh();
      } catch {
        setSaveStatus("error");
      }
    });
  }

  function handleDiscard() {
    setVariantList(initialVariants);
    setPendingDeletes(new Set());
    setDirtyVariantIds(new Set());
    setDetailsDirty(false);
    setDetailsResetKey((k) => k + 1);
    setSaveStatus("idle");
  }

  const showBar = changeCount > 0 || saveStatus !== "idle";

  return (
    <>
      {/* ---- Details ---- */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <h2 className="font-headline text-xl font-bold text-primary">Details</h2>
        <form
          key={detailsResetKey}
          ref={detailsFormRef}
          onSubmit={(e) => e.preventDefault()}
          onChange={() => {
            setDetailsDirty(true);
            setSaveStatus("idle");
          }}
          className="mt-4 space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Name" defaultValue={product.name} required />
            <Field name="slug" label="URL slug" defaultValue={product.slug} />
          </div>
          <TextArea
            name="shortDescription"
            label="Description"
            rows={5}
            defaultValue={product.shortDescription ?? ""}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <CategorySelect
              categories={categories}
              defaultSlug={currentCategorySlug}
              required
              onDirty={() => { setDetailsDirty(true); setSaveStatus("idle"); }}
            />
            <Field
              name="sortOrder"
              type="number"
              label="Sort order"
              defaultValue={String(product.sortOrder)}
            />
            <ChipInput
              label="Chip callouts"
              name="ingredientChips"
              initialChips={product.ingredientChips ?? []}
              maxChips={8}
              onDirty={() => { setDetailsDirty(true); setSaveStatus("idle"); }}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <Toggle
              name="isAvailable"
              label="Available on /shop"
              defaultChecked={product.isAvailable}
            />
            <Toggle
              name="isFeatured"
              label="Featured on homepage"
              defaultChecked={product.isFeatured}
            />
          </div>
        </form>
      </NibbleCard>

      {/* ---- Variants ---- */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-headline text-xl font-bold text-primary">Variants</h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            {variantList.filter((v) => !pendingDeletes.has(v.id)).length} active
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                <th className="w-8 pb-2" />
                <th className="pb-2 font-label text-xs uppercase tracking-[0.12em]">
                  Label
                </th>
                <th className="w-28 pb-2 font-label text-xs uppercase tracking-[0.12em]">
                  Price ($)
                </th>
                <th className="hidden w-24 pb-2 font-label text-xs uppercase tracking-[0.12em] sm:table-cell">
                  Weight (oz)
                </th>
                <th className="hidden w-20 pb-2 font-label text-xs uppercase tracking-[0.12em] sm:table-cell" title="How many individual items (cookies, muffins) are in this variant">
                  Items
                </th>
                <th className="w-20 pb-2 text-center font-label text-xs uppercase tracking-[0.12em]">
                  Active
                </th>
                <th className="w-16 pb-2 text-center font-label text-xs uppercase tracking-[0.12em]">
                  Default
                </th>
                <th className="w-8 pb-2" />
              </tr>
            </thead>
            <tbody>
              {variantList.map((v, idx) => {
                const isDeleted = pendingDeletes.has(v.id);
                return (
                  <tr
                    key={v.id}
                    draggable={!isDeleted}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={[
                      "border-b border-outline-variant/40 transition-colors",
                      isDeleted ? "opacity-40" : "",
                      dragOverIdx === idx && !isDeleted
                        ? "bg-primary-fixed/40"
                        : "hover:bg-surface-container-low",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {/* Drag handle */}
                    <td className="select-none py-2 pr-2 text-lg leading-none text-on-surface-variant/30 cursor-grab">
                      ⠿
                    </td>

                    {/* Label */}
                    <td className="py-2 pr-3">
                      {isDeleted ? (
                        <span className="font-body text-on-surface-variant line-through">
                          {v.label}
                        </span>
                      ) : (
                        <input
                          value={v.label}
                          onChange={(e) =>
                            updateVariant(v.id, "label", e.target.value)
                          }
                          placeholder="e.g. Dozen"
                          className="ghost-border w-full rounded-md bg-surface-container-high px-2 py-1.5 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                        />
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-2 pr-3">
                      {!isDeleted && (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.priceUsd}
                          onChange={(e) =>
                            updateVariant(v.id, "priceUsd", e.target.value)
                          }
                          placeholder="0.00"
                          className="ghost-border w-full rounded-md bg-surface-container-high px-2 py-1.5 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                        />
                      )}
                    </td>

                    {/* Weight */}
                    <td className="hidden py-2 pr-3 sm:table-cell">
                      {!isDeleted && (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={v.weightOz}
                          onChange={(e) =>
                            updateVariant(v.id, "weightOz", e.target.value)
                          }
                          placeholder="—"
                          className="ghost-border w-full rounded-md bg-surface-container-high px-2 py-1.5 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                        />
                      )}
                    </td>

                    {/* Items (unit count) */}
                    <td className="hidden py-2 pr-3 sm:table-cell">
                      {!isDeleted && (
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={v.unitCount}
                          onChange={(e) =>
                            updateVariant(v.id, "unitCount", e.target.value)
                          }
                          placeholder="—"
                          className="ghost-border w-full rounded-md bg-surface-container-high px-2 py-1.5 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                        />
                      )}
                    </td>

                    {/* Active */}
                    <td className="py-2 pr-3 text-center">
                      {!isDeleted && (
                        <input
                          type="checkbox"
                          checked={v.isAvailable}
                          onChange={(e) =>
                            updateVariant(v.id, "isAvailable", e.target.checked)
                          }
                          className="h-4 w-4 accent-primary"
                        />
                      )}
                    </td>

                    {/* Default */}
                    <td className="py-2 pr-3 text-center">
                      {!isDeleted && (
                        <button
                          type="button"
                          onClick={() => setDefaultVariant(v.id)}
                          title={v.isDefault ? "Default variant" : "Set as default"}
                          className={
                            v.isDefault
                              ? "text-lg text-primary"
                              : "text-lg text-on-surface-variant/30 transition-colors hover:text-primary"
                          }
                        >
                          {v.isDefault ? "★" : "☆"}
                        </button>
                      )}
                    </td>

                    {/* Trash / Undo */}
                    <td className="py-2 text-right">
                      {isDeleted ? (
                        <button
                          type="button"
                          onClick={() => undoDelete(v.id)}
                          className="font-label text-xs uppercase tracking-[0.1em] text-primary hover:underline"
                        >
                          ↩&nbsp;Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markDelete(v.id)}
                          title="Delete variant"
                          className="text-on-surface-variant/40 transition-colors hover:text-on-error-container"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addVariant}
          className="mt-4 font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
        >
          + Add variant
        </button>
      </NibbleCard>

      {/* ---- Ingredients ---- */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-headline text-xl font-bold text-primary">Ingredients</h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            per individual item
          </span>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">
          Quantities are per individual cookie / muffin / item. Use the &ldquo;Items&rdquo; column on variants above to set how many items are in each variant.
        </p>

        {/* Existing ingredient rows */}
        {ingList.length > 0 && (
          <ul className="mt-4 divide-y divide-outline-variant/40">
            {ingList.map((pi, idx) => (
              <li
                key={pi.id}
                draggable
                onDragStart={() => { ingDragIdx.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); setIngDragOverIdx(idx); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = ingDragIdx.current;
                  if (from === null || from === idx) { setIngDragOverIdx(null); return; }
                  const next = [...ingList];
                  const [removed] = next.splice(from, 1);
                  next.splice(idx, 0, removed);
                  setIngList(next);
                  ingDragIdx.current = null;
                  setIngDragOverIdx(null);
                  startIngTransition(async () => {
                    await reorderProductIngredientsAction(product.id, next.map((p) => p.id));
                  });
                }}
                onDragEnd={() => { setIngDragOverIdx(null); ingDragIdx.current = null; }}
                className={[
                  "flex items-center gap-3 py-2 transition-colors",
                  ingDragOverIdx === idx ? "bg-primary-fixed/40" : "",
                ].filter(Boolean).join(" ")}
              >
                <span className="select-none text-lg leading-none text-on-surface-variant/30 cursor-grab">⠿</span>
                <span className="flex-1 font-medium text-on-surface">{pi.ingredient.name}</span>
                <span className="text-sm text-on-surface-variant">{pi.quantityPerUnit} {pi.unit}</span>
                <button
                  type="button"
                  disabled={ingPending}
                  onClick={() => startIngTransition(async () => {
                    await removeProductIngredientAction(pi.id, product.id);
                    setIngList((l) => l.filter((x) => x.id !== pi.id));
                  })}
                  className="text-on-surface-variant/40 transition-colors hover:text-on-error-container disabled:opacity-40"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add ingredient */}
        <div className="mt-4 space-y-3">
          <p className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            Add ingredient
          </p>
          {selectedIng ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary-fixed px-3 py-1.5 text-sm font-medium text-on-surface">
                {selectedIng.name}
              </span>
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="Qty"
                value={ingQty}
                onChange={(e) => setIngQty(e.target.value)}
                className="ghost-border w-24 rounded-md bg-surface-container-high px-2 py-1.5 text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
              <input
                type="text"
                placeholder="unit"
                value={ingUnit}
                onChange={(e) => setIngUnit(e.target.value)}
                className="ghost-border w-20 rounded-md bg-surface-container-high px-2 py-1.5 text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
              <BiteButton
                type="button"
                size="md"
                biteColor="var(--color-surface-container-lowest)"
                disabled={ingPending || !ingQty}
                onClick={() => startIngTransition(async () => {
                  if (!selectedIng || !ingQty) return;
                  const newRow = await addProductIngredientAction({
                    productId: product.id,
                    ingredientId: selectedIng.id,
                    quantityPerUnit: ingQty,
                    unit: ingUnit || selectedIng.defaultUnit,
                    sortOrder: ingList.length * 10,
                  });
                  if (newRow) setIngList((l) => [...l, newRow]);
                  setSelectedIng(null);
                  setIngQty("");
                  setIngUnit("");
                  setIngSearch("");
                  setIngResults([]);
                })}
              >
                {ingPending ? "Adding…" : "Add"}
              </BiteButton>
              <BiteButton
                type="button"
                size="md"
                variant="ghost"
                onClick={() => { setSelectedIng(null); setIngQty(""); setIngUnit(""); setIngSearch(""); setIngResults([]); }}
              >
                Cancel
              </BiteButton>
            </div>
          ) : (
            <div className="relative max-w-xs">
              <input
                type="text"
                placeholder="Search ingredients…"
                value={ingSearch}
                onChange={(e) => {
                  setIngSearch(e.target.value);
                  searchIngredients(e.target.value);
                }}
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
              {ingResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-md border border-outline-variant bg-surface-container-lowest shadow-lg">
                  {ingResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIng(r);
                          setIngUnit(r.defaultUnit);
                          setIngResults([]);
                          setIngSearch("");
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
      </NibbleCard>

      {/* Spacer so content isn't hidden behind the fixed bar */}
      {showBar && <div className="h-20" />}

      {/* Save bar — rendered via portal directly into <body> so position:fixed
          is always relative to the true viewport, not any CSS containing block. */}
      {mounted &&
        showBar &&
        createPortal(
          <div className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-between gap-4 border-t border-outline-variant bg-surface-container px-6 py-4 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] md:left-64">
            <span className="font-label text-sm text-on-surface">
              {saveStatus === "saved"
                ? "All changes saved."
                : saveStatus === "error"
                ? "Save failed — please try again."
                : `${changeCount} unsaved ${changeCount === 1 ? "change" : "changes"}`}
            </span>
            {changeCount > 0 && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isPending}
                  className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-40"
                >
                  Discard
                </button>
                <BiteButton
                  size="md"
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  biteColor="var(--color-surface-container)"
                >
                  {isPending ? "Saving…" : "Save"}
                </BiteButton>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ----- Shared form field helpers -----

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  const isMoney = name.endsWith("Usd") || name.includes("price");
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={isMoney && type === "number" ? "0.01" : undefined}
        min={isMoney && type === "number" ? 0 : undefined}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  rows = 3,
  defaultValue,
}: {
  name: string;
  label: string;
  rows?: number;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
        {label}
      </span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// ChipInput — multi-tag input (Odoo-style M2M tags).
// Writes a hidden comma-separated input so the parent FormData read works.
// ---------------------------------------------------------------------------

function ChipInput({
  label,
  name,
  initialChips = [],
  maxChips = 8,
  onDirty,
}: {
  label: string;
  name: string;
  initialChips?: string[];
  maxChips?: number;
  onDirty?: () => void;
}) {
  const [chips, setChips] = useState<string[]>(initialChips);
  const [inputVal, setInputVal] = useState("");

  function addChip(raw: string) {
    // Support pasting comma-separated values in one go
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setChips((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.includes(p) && next.length < maxChips) next.push(p);
      }
      return next;
    });
    setInputVal("");
    onDirty?.();
  }

  function removeChip(idx: number) {
    setChips((prev) => prev.filter((_, i) => i !== idx));
    onDirty?.();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputVal.trim()) addChip(inputVal);
    } else if (e.key === "Backspace" && !inputVal && chips.length > 0) {
      removeChip(chips.length - 1);
    }
  }

  return (
    <div>
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
        {label}
      </span>
      {/* Hidden input carries the value into the parent FormData */}
      <input type="hidden" name={name} value={chips.join(", ")} />
      <div className="ghost-border mt-1 flex flex-wrap items-center gap-1.5 rounded-md bg-surface-container-high px-2.5 py-2 focus-within:bg-primary-fixed focus-within:outline-none">
        {chips.map((chip, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 font-label text-xs font-medium text-primary"
          >
            {chip}
            <button
              type="button"
              onClick={() => removeChip(idx)}
              aria-label={`Remove ${chip}`}
              className="ml-0.5 text-primary/60 hover:text-primary leading-none"
            >
              ×
            </button>
          </span>
        ))}
        {chips.length < maxChips && (
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (inputVal.trim()) addChip(inputVal); }}
            placeholder={chips.length === 0 ? "Type and press Enter…" : ""}
            className="min-w-0 flex-1 bg-transparent font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategorySelect — typeahead combobox that posts a slug hidden input.
// ---------------------------------------------------------------------------

function CategorySelect({
  categories,
  defaultSlug,
  required,
  onDirty,
}: {
  categories: Category[];
  defaultSlug?: string;
  required?: boolean;
  onDirty?: () => void;
}) {
  const initial = categories.find((c) => c.slug === defaultSlug);
  const [selectedSlug, setSelectedSlug] = useState(defaultSlug ?? "");
  const [inputVal, setInputVal] = useState(initial?.name ?? "");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(inputVal.toLowerCase()) ||
      c.slug.toLowerCase().includes(inputVal.toLowerCase())
  );

  function select(cat: { slug: string; name: string }) {
    setSelectedSlug(cat.slug);
    setInputVal(cat.name);
    setOpen(false);
    onDirty?.();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightIdx]) select(filtered[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        // If the input text doesn't match the selected slug, restore it
        const sel = categories.find((c) => c.slug === selectedSlug);
        if (sel) setInputVal(sel.name);
        else if (!selectedSlug) setInputVal("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, categories]);

  const isInvalid = inputVal.length > 0 && !selectedSlug;

  return (
    <div ref={containerRef} className="relative">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
        Category
      </span>
      {/* Hidden input carries the slug into the parent FormData */}
      <input type="hidden" name="categorySlug" value={selectedSlug} />
      <input
        type="text"
        value={inputVal}
        required={required}
        placeholder="Start typing…"
        autoComplete="off"
        onFocus={() => { setOpen(true); setHighlightIdx(0); }}
        onChange={(e) => {
          setInputVal(e.target.value);
          setOpen(true);
          setHighlightIdx(0);
          // Clear slug when user edits away from the selected name
          setSelectedSlug("");
          onDirty?.();
        }}
        onKeyDown={handleKeyDown}
        className={[
          "ghost-border mt-1 w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none",
          isInvalid ? "ring-1 ring-error" : "",
        ].join(" ")}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-outline-variant/20 bg-surface-container-highest shadow-[var(--shadow-chocolate-lg)]">
          {filtered.map((cat, idx) => (
            <li
              key={cat.slug}
              onMouseDown={(e) => {
                e.preventDefault(); // keep input focused
                select(cat);
              }}
              className={[
                "cursor-pointer px-4 py-2 font-body text-sm",
                idx === highlightIdx
                  ? "bg-primary-fixed text-primary"
                  : "text-on-surface hover:bg-surface-container-low",
              ].join(" ")}
            >
              {cat.name}
            </li>
          ))}
        </ul>
      )}
      {isInvalid && (
        <p className="mt-1 text-xs text-on-error-container">
          Pick from the list.{" "}
          <a href="/admin/categories/new" className="underline">
            Create one
          </a>{" "}
          if needed.
        </p>
      )}
    </div>
  );
}
