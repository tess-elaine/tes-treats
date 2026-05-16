"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSaveBar } from "@/components/ui/admin-save-bar";
import { ALLERGEN_KEYS, ALLERGEN_LABELS } from "@/lib/allergens";
import { saveIngredientAction } from "../../actions";
import { UnitAndGramsFields } from "../../UnitAndGramsFields";

type Ingredient = {
  id: string;
  name: string;
  defaultUnit: string;
  allergens: string[];
  gramsPerUnit: string | null;
  purchaseUnit: string | null;
  purchaseCostCents: number | null;
  purchaseQuantity: string | null;
};

export function IngredientEditClient({ ing }: { ing: Ingredient }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const changeCount = isDirty ? 1 : 0;

  function handleSave() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("id", ing.id);
    startTransition(async () => {
      try {
        await saveIngredientAction(fd);
        setIsDirty(false);
        setSaveStatus("saved");
        router.refresh();
      } catch {
        setSaveStatus("error");
      }
    });
  }

  function handleDiscard() {
    setIsDirty(false);
    setSaveStatus("idle");
    setResetKey((k) => k + 1);
  }

  return (
    <>
      <NibbleCard bite="none" className="mt-8 p-6 md:p-10 max-w-xl">
        <form
          key={resetKey}
          ref={formRef}
          onSubmit={(e) => e.preventDefault()}
          onChange={() => { setIsDirty(true); setSaveStatus("idle"); }}
          className="space-y-6"
        >
          <input type="hidden" name="id" value={ing.id} />

          <div>
            <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
              Name *
            </label>
            <input
              name="name"
              required
              defaultValue={ing.name}
              className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
          </div>

          <UnitAndGramsFields
            initialUnit={ing.defaultUnit}
            initialGrams={ing.gramsPerUnit ?? ""}
            initialPurchaseUnit={ing.purchaseUnit ?? ""}
            initialPurchaseCost={
              ing.purchaseCostCents != null
                ? (ing.purchaseCostCents / 100).toFixed(2)
                : ""
            }
            initialPurchaseQuantity={ing.purchaseQuantity ?? ""}
          />

          <div>
            <p className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-2">
              Allergens
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALLERGEN_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`allergen_${key}`}
                    value="on"
                    defaultChecked={ing.allergens.includes(key)}
                    className="h-4 w-4 accent-primary"
                  />
                  {ALLERGEN_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        </form>
      </NibbleCard>

      {(changeCount > 0 || saveStatus !== "idle") && <div className="h-20" />}
      <AdminSaveBar
        changeCount={changeCount}
        saveStatus={saveStatus}
        isPending={isPending}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
