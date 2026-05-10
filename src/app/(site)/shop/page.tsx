import Link from "next/link";
import Image from "next/image";
import { NibbleCard } from "@/components/ui/nibble-card";
import { IngredientChip } from "@/components/ui/ingredient-chip";
import { QuickAddButton } from "@/components/site/quick-add-button";
import { db } from "@/db";
import { formatCents } from "@/lib/format";
import { primaryImagesByProductIds } from "@/lib/products";

export const metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const items = await db.query.products.findMany({
    where: (t, { eq }) => eq(t.isAvailable, true),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  });

  // Pull each product's default variant for price + quick-add.
  const variantsByProduct = new Map<string, { id: string; label: string; priceCents: number }>();
  for (const p of items) {
    const v = await db.query.productVariants.findFirst({
      where: (t, { and, eq }) => and(eq(t.productId, p.id), eq(t.isAvailable, true)),
      orderBy: (t, { desc, asc }) => [desc(t.isDefault), asc(t.sortOrder)],
    });
    if (v) variantsByProduct.set(p.id, { id: v.id, label: v.label, priceCents: v.priceCents });
  }
  const images = await primaryImagesByProductIds(items.map((p) => p.id));

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-7xl">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          The whole tray
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-6xl">
          Shop the treats.
        </h1>

        {items.length === 0 ? (
          <NibbleCard className="mt-10 p-10 text-center">
            <p className="text-tertiary">
              The shop is taking a quick break — check back soon.
            </p>
          </NibbleCard>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {items.map((p) => {
              const v = variantsByProduct.get(p.id);
              return (
                <NibbleCard key={p.id} className="group flex flex-col">
                  <Link href={`/shop/${p.slug}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gradient-to-br from-secondary-container to-tertiary-fixed">
                      {images.get(p.id) ? (
                        <Image
                          src={images.get(p.id)!}
                          alt={p.name}
                          fill
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-col p-5 pb-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.ingredientChips ?? []).map((c, i) => (
                          <IngredientChip key={c} tilt={i % 2 ? "right" : "left"}>
                            {c}
                          </IngredientChip>
                        ))}
                      </div>
                      <h3 className="mt-3 font-headline text-xl font-bold text-primary transition-colors duration-200 group-hover:text-secondary">
                        {p.name}
                      </h3>
                      {p.shortDescription ? (
                        <p className="mt-1 text-sm text-tertiary">{p.shortDescription}</p>
                      ) : null}
                    </div>
                  </Link>

                  {/* Footer outside the Link — buttons can't be nested inside <a> */}
                  <div className="mt-auto flex flex-col gap-2 px-5 pb-5 pt-2">
                    {/* Price */}
                    {v ? (
                      <div>
                        <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                          {v.label}
                        </p>
                        <p className="font-headline text-xl font-bold text-on-surface">
                          {formatCents(v.priceCents)}
                        </p>
                      </div>
                    ) : null}
                    {/* Action row */}
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/shop/${p.slug}`}
                        className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:text-secondary"
                      >
                        View product
                      </Link>
                      {v ? (
                        <QuickAddButton
                          variantId={v.id}
                          productName={p.name}
                          biteColor="var(--color-surface-container-lowest)"
                        />
                      ) : null}
                    </div>
                  </div>
                </NibbleCard>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
