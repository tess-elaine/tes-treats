import { notFound } from "next/navigation";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { ALLERGEN_KEYS, ALLERGEN_LABELS } from "@/lib/allergens";
import { updateIngredientAction } from "../../actions";

export const metadata = { title: "Edit ingredient" };

const COMMON_UNITS = ["cup", "tbsp", "tsp", "oz", "g", "lb", "each", "pinch"];

export default async function EditIngredientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const ing = await db.query.ingredients.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!ing) notFound();

  return (
    <section>
      <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
        Ingredients
      </p>
      <h1 className="mt-1 font-headline text-3xl font-extrabold text-primary">
        Edit: {ing.name}
      </h1>

      <NibbleCard bite="none" className="mt-8 p-6 md:p-10 max-w-xl">
        <form action={updateIngredientAction} className="space-y-6">
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

          <div>
            <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-2">
              Default unit
            </label>
            <select
              name="defaultUnit"
              defaultValue={ing.defaultUnit}
              className="ghost-border rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

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

          <div className="flex gap-3">
            <BiteButton type="submit" size="md">
              Save changes
            </BiteButton>
            <BiteButton href="/admin/ingredients" variant="secondary" size="md">
              Cancel
            </BiteButton>
          </div>
        </form>
      </NibbleCard>
    </section>
  );
}
