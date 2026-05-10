import Link from "next/link";
import { notFound } from "next/navigation";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { IngredientChip } from "@/components/ui/ingredient-chip";
import { ProductGallery } from "@/components/site/product-gallery";
import { db } from "@/db";
import { formatCents } from "@/lib/format";
import { imagesForProduct } from "@/lib/products";
import { AddToCartForm } from "@/components/site/add-to-cart-form";
import { ALLERGEN_LABELS } from "@/lib/allergens";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
    columns: { name: true, shortDescription: true },
  });
  if (!product) return { title: "Not found" };
  return { title: product.name, description: product.shortDescription ?? undefined };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  });
  if (!product || !product.isAvailable) notFound();

  const [variants, images, productIngredients] = await Promise.all([
    db.query.productVariants.findMany({
      where: (t, { and, eq }) => and(eq(t.productId, product.id), eq(t.isAvailable, true)),
      orderBy: (t, { asc, desc }) => [desc(t.isDefault), asc(t.sortOrder)],
    }),
    imagesForProduct(product.id),
    db.query.productIngredients.findMany({
      where: (t, { eq }) => eq(t.productId, product.id),
      with: { ingredient: { columns: { allergens: true } } },
    }),
  ]);

  const allergens = [
    ...new Set(productIngredients.flatMap((pi) => pi.ingredient.allergens)),
  ] as (keyof typeof ALLERGEN_LABELS)[];

  if (variants.length === 0) {
    return (
      <section className="px-6 py-section">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-headline text-3xl font-extrabold text-primary">
            {product.name}
          </h1>
          <p className="mt-3 text-tertiary">
            Out of stock right now — Tess is restocking soon.
          </p>
          <div className="mt-6">
            <BiteButton href="/shop" variant="ghost">
              ← Back to the shop
            </BiteButton>
          </div>
        </div>
      </section>
    );
  }

  const defaultVariant = variants[0];

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/shop"
          className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
        >
          ← Back to the shop
        </Link>

        <div className="mt-6 grid gap-12 md:grid-cols-2">
          <ProductGallery
            images={images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))}
            productName={product.name}
          />

          <div>
            <div className="flex flex-wrap gap-1.5">
              {(product.ingredientChips ?? []).map((c, i) => (
                <IngredientChip key={c} tilt={i % 2 ? "right" : "left"}>
                  {c}
                </IngredientChip>
              ))}
            </div>
            <h1 className="mt-4 font-headline text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              {product.name}
            </h1>
            {product.shortDescription ? (
              <p className="mt-3 font-body text-lg text-tertiary">
                {product.shortDescription}
              </p>
            ) : null}
            {product.description ? (
              <p className="mt-6 font-body text-on-surface">{product.description}</p>
            ) : null}
            {allergens.length > 0 && (
              <p className="mt-4 text-sm text-on-surface-variant">
                <span className="font-medium text-on-surface">Contains: </span>
                {allergens
                  .map((a) => ALLERGEN_LABELS[a] ?? a)
                  .join(" · ")}
              </p>
            )}

            <NibbleCard bite="none" className="mt-8 p-6">
              <AddToCartForm itemName={product.name} className="space-y-4">
                <input type="hidden" name="kind" value="variant" />

                <fieldset>
                  <legend className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                    How many?
                  </legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {variants.map((v, i) => (
                      <label
                        key={v.id}
                        className="flex cursor-pointer items-center justify-between rounded-md bg-surface-container-high p-3 transition-colors has-[:checked]:bg-primary-fixed"
                      >
                        <div>
                          <p className="font-headline font-bold text-on-surface">
                            {v.label}
                          </p>
                          <p className="font-headline text-lg text-primary">
                            {formatCents(v.priceCents)}
                          </p>
                        </div>
                        <input
                          type="radio"
                          name="productVariantId"
                          value={v.id}
                          defaultChecked={i === 0}
                          required
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="flex items-end gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">Qty</span>
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      max={99}
                      defaultValue={1}
                      className="ghost-border w-20 rounded-md bg-surface-container-high px-3 py-3 text-center font-body"
                    />
                  </label>
                  <BiteButton size="lg" className="flex-1">
                    Add to cart — {formatCents(defaultVariant.priceCents)}
                  </BiteButton>
                </div>
              </AddToCartForm>
            </NibbleCard>
          </div>
        </div>
      </div>
    </section>
  );
}
