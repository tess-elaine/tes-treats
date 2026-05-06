/**
 * Product image / category helpers.
 *
 * Images live in `product_image` with one row per image and a single
 * `is_primary=true` per product. Most read sites only need the primary
 * URL — that's what `primaryImagesByProductIds` is for.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productImages, productCategories, products } from "@/db/schema/catalog";

/** Map of productId → primary image URL. Use for list/grid views. */
export async function primaryImagesByProductIds(
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
    })
    .from(productImages)
    .where(and(inArray(productImages.productId, ids), eq(productImages.isPrimary, true)));
  return new Map(rows.map((r) => [r.productId, r.url]));
}

/** Just the primary image for one product, or null. */
export async function primaryImageForProduct(
  productId: string,
): Promise<string | null> {
  const row = await db.query.productImages.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.productId, productId), eq(t.isPrimary, true)),
  });
  return row?.url ?? null;
}

/** Full image gallery for a product, primary first then by sort order. */
export async function imagesForProduct(productId: string) {
  return db.query.productImages.findMany({
    where: (t, { eq }) => eq(t.productId, productId),
    orderBy: (t, { desc, asc }) => [desc(t.isPrimary), asc(t.sortOrder), asc(t.createdAt)],
  });
}

export async function listCategories() {
  return db.query.productCategories.findMany({
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  });
}

export async function categoryBySlug(slug: string) {
  return db.query.productCategories.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  });
}

/** First active category, or any category — used as a fallback default. */
export async function defaultCategoryId(): Promise<string | null> {
  const row = await db.query.productCategories.findFirst({
    where: (t, { eq }) => eq(t.isActive, true),
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });
  return row?.id ?? null;
}

/** Inverse helper: find the category referenced by a product. */
export async function categoryForProduct(productId: string) {
  const row = await db
    .select({
      id: productCategories.id,
      slug: productCategories.slug,
      name: productCategories.name,
    })
    .from(products)
    .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(eq(products.id, productId))
    .limit(1);
  return row[0] ?? null;
}
