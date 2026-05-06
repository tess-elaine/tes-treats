import Link from "next/link";
import Image from "next/image";
import { NibbleCard } from "@/components/ui/nibble-card";
import { IngredientChip } from "@/components/ui/ingredient-chip";
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

  // Pull each product's default variant for the price tag.
  const variantsByProduct = new Map<string, { label: string; priceCents: number }>();
  for (const p of items) {
    const v = await db.query.productVariants.findFirst({
      where: (t, { and, eq }) => and(eq(t.productId, p.id), eq(t.isAvailable, true)),
      orderBy: (t, { desc, asc }) => [desc(t.isDefault), asc(t.sortOrder)],
    });
    if (v) variantsByProduct.set(p.id, { label: v.label, priceCents: v.priceCents });
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
                <Link
                  key={p.id}
                  href={`/shop/${p.slug}`}
                  className="group block"
                >
                  <NibbleCard className="flex h-full flex-col">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-secondary-container to-tertiary-fixed">
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
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex flex-wrap gap-1">
                        {(p.ingredientChips ?? []).map((c, i) => (
                          <IngredientChip key={c} tilt={i % 2 ? "right" : "left"}>
                            {c}
                          </IngredientChip>
                        ))}
                      </div>
                      <h3 className="mt-3 font-headline text-xl font-bold text-primary">
                        {p.name}
                      </h3>
                      {p.shortDescription ? (
                        <p className="mt-1 text-sm text-tertiary">{p.shortDescription}</p>
                      ) : null}
                      <div className="mt-auto flex items-end justify-between pt-6">
                        <div>
                          {v ? (
                            <>
                              <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                                {v.label}
                              </p>
                              <p className="font-headline text-2xl font-bold text-on-surface">
                                {formatCents(v.priceCents)}
                              </p>
                            </>
                          ) : null}
                        </div>
                        <span className="font-label uppercase tracking-[0.12em] text-sm text-primary group-hover:text-secondary">
                          View →
                        </span>
                      </div>
                    </div>
                  </NibbleCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
