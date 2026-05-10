import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { requireAdmin } from "@/lib/auth-helpers";
import { ALLERGEN_KEYS, ALLERGEN_LABELS } from "@/lib/allergens";
import { createIngredientAction } from "../actions";
import { UnitAndGramsFields } from "../UnitAndGramsFields";

export const metadata = { title: "New ingredient" };

export default async function NewIngredientPage() {
  await requireAdmin();

  return (
    <section>
      <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
        Ingredients
      </p>
      <h1 className="mt-1 font-headline text-3xl font-extrabold text-primary">
        New ingredient
      </h1>

      <NibbleCard bite="none" className="mt-8 p-6 md:p-10 max-w-xl">
        <form action={createIngredientAction} className="space-y-6">
          <div>
            <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
              Name *
            </label>
            <input
              name="name"
              required
              placeholder="e.g. All-Purpose Flour"
              className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
          </div>

          <UnitAndGramsFields />

          <div>
            <p className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-2">
              Allergens (check all that apply)
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALLERGEN_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`allergen_${key}`}
                    value="on"
                    className="h-4 w-4 accent-primary"
                  />
                  {ALLERGEN_LABELS[key]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <BiteButton type="submit" size="md" biteColor="var(--color-surface-container-lowest)">
              Save ingredient
            </BiteButton>
            <BiteButton href="/admin/ingredients" variant="secondary" size="md" biteColor="var(--color-surface-container-lowest)">
              Cancel
            </BiteButton>
          </div>
        </form>
      </NibbleCard>
    </section>
  );
}
