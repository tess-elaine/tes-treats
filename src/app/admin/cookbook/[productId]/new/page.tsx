import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { createRecipeAction } from "../../actions";

export const metadata = { title: "New recipe" };

export default async function NewRecipePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdmin();
  const { productId } = await params;

  const product = await db.query.products.findFirst({
    where: (t, { eq }) => eq(t.id, productId),
    columns: { id: true, name: true },
  });
  if (!product) notFound();

  const action = createRecipeAction.bind(null, productId);

  return (
    <section>
      <Link
        href={`/admin/cookbook/${productId}`}
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← {product.name}
      </Link>
      <h1 className="mt-4 font-headline text-3xl font-extrabold text-primary">
        New recipe
      </h1>

      <NibbleCard bite="none" className="mt-8 p-6 md:p-10 max-w-2xl">
        <form action={action} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Recipe name *
              </label>
              <input
                name="name"
                required
                defaultValue="Standard Batch"
                placeholder="e.g. Standard Batch, Double Batch"
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Batch yield (cookies) *
              </label>
              <input
                name="batchYield"
                type="number"
                min="1"
                required
                placeholder="24"
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Scoop size
              </label>
              <input
                name="scoopSize"
                placeholder="e.g. Medium, 4oz scoop"
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Bake temp (°F)
              </label>
              <input
                name="bakeTemp"
                type="number"
                placeholder="350"
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                  Bake min (min)
                </label>
                <input
                  name="bakeTimeMin"
                  type="number"
                  placeholder="13"
                  className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                  Bake max (min)
                </label>
                <input
                  name="bakeTimeMax"
                  type="number"
                  placeholder="15"
                  className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Cookies per pan
              </label>
              <input
                name="cookiesPerPan"
                type="number"
                placeholder="8"
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Directions
              </label>
              <textarea
                name="directions"
                rows={8}
                placeholder="1. Preheat oven to 350°F…&#10;2. Cream butter and sugars…"
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Storage, substitutions, tips…"
                className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-on-surface-variant">
            You&apos;ll add ingredients on the next screen.
          </p>

          <div className="flex gap-3">
            <BiteButton type="submit" size="md" biteColor="var(--color-surface-container-lowest)">
              Create recipe
            </BiteButton>
            <BiteButton
              href={`/admin/cookbook/${productId}`}
              variant="secondary"
              size="md"
              biteColor="var(--color-surface-container-lowest)"
            >
              Cancel
            </BiteButton>
          </div>
        </form>
      </NibbleCard>
    </section>
  );
}
