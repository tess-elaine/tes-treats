"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  productVariants,
  productCategories,
  productImages,
} from "@/db/schema/catalog";
import { putObject, processUploadedImage } from "@/lib/storage";
import { requireAdmin } from "@/lib/auth-helpers";

function s(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}
function nullableInt(v: FormDataEntryValue | null) {
  const n = Number(s(v));
  return Number.isFinite(n) ? n : null;
}
function dollarsToCents(v: FormDataEntryValue | null) {
  const n = Number(s(v));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
function parseChips(text: string): string[] {
  return text
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 8);
}
function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/**
 * Resolve a category from the form. The product form posts a slug from the
 * datalist (typeahead). If unrecognized we bail out.
 */
async function resolveCategoryId(formData: FormData): Promise<string | null> {
  const slug = s(formData.get("categorySlug"));
  if (!slug) return null;
  const cat = await db.query.productCategories.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  });
  return cat?.id ?? null;
}

async function uploadProductImage(productId: string, file: File): Promise<string> {
  const raw = Buffer.from(await file.arrayBuffer());
  const processed = await processUploadedImage(raw);
  const { url } = await putObject({
    prefix: `products/${productId}`,
    filename: `image${processed.extension}`,
    body: processed.buffer,
    contentType: processed.contentType,
  });
  return url;
}

// ---------------------------------------------------------------------------
// Product create / update / delete
// ---------------------------------------------------------------------------

export async function createProductAction(formData: FormData) {
  await requireAdmin();
  const name = s(formData.get("name"));
  if (!name) redirect("/admin/products/new?error=name");

  const slug = s(formData.get("slug")) || slugify(name);
  const existing = await db.query.products.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  });
  if (existing) redirect("/admin/products/new?error=slug");

  const categoryId = await resolveCategoryId(formData);
  if (!categoryId) redirect("/admin/products/new?error=category");

  const [created] = await db
    .insert(products)
    .values({
      name,
      slug,
      shortDescription: s(formData.get("shortDescription")) || null,
      description: s(formData.get("description")) || null,
      categoryId: categoryId!,
      isFeatured: formData.get("isFeatured") === "on",
      isAvailable: formData.get("isAvailable") === "on",
      sortOrder: nullableInt(formData.get("sortOrder")) ?? 0,
      ingredientChips: parseChips(s(formData.get("ingredientChips"))),
    })
    .returning({ id: products.id });

  // Optional first image gets uploaded and marked primary.
  const file = formData.get("image") as File | null;
  if (file && file instanceof File && file.size > 0 && file.size <= 8 * 1024 * 1024) {
    const url = await uploadProductImage(created.id, file);
    await db.insert(productImages).values({
      productId: created.id,
      url,
      isPrimary: true,
      sortOrder: 0,
    });
  }

  // Optional first variant.
  const variantLabel = s(formData.get("variantLabel"));
  const variantPriceCents = dollarsToCents(formData.get("variantPriceUsd"));
  if (variantLabel && variantPriceCents != null) {
    await db.insert(productVariants).values({
      productId: created.id,
      label: variantLabel,
      priceCents: variantPriceCents,
      isDefault: true,
    });
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${created.id}`);
}

export async function updateProductAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  const name = s(formData.get("name"));
  const slug = s(formData.get("slug")) || slugify(name);
  const categoryId = await resolveCategoryId(formData);
  if (!categoryId) redirect(`/admin/products/${id}?error=category`);

  await db
    .update(products)
    .set({
      name,
      slug,
      shortDescription: s(formData.get("shortDescription")) || null,
      description: s(formData.get("description")) || null,
      categoryId: categoryId!,
      isFeatured: formData.get("isFeatured") === "on",
      isAvailable: formData.get("isAvailable") === "on",
      sortOrder: nullableInt(formData.get("sortOrder")) ?? 0,
      ingredientChips: parseChips(s(formData.get("ingredientChips"))),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  redirect(`/admin/products/${id}`);
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

// ---------------------------------------------------------------------------
// Image management — multi-image gallery per product
// ---------------------------------------------------------------------------

export async function addProductImageAction(formData: FormData) {
  await requireAdmin();
  const productId = s(formData.get("productId"));
  const file = formData.get("image") as File | null;
  if (!productId || !file || !(file instanceof File) || file.size === 0) return;
  if (file.size > 8 * 1024 * 1024) {
    redirect(`/admin/products/${productId}?error=image-size`);
  }

  const url = await uploadProductImage(productId, file);
  // Decide primary: if there are no images yet, this becomes primary.
  const existing = await db.query.productImages.findMany({
    where: (t, { eq }) => eq(t.productId, productId),
  });
  await db.insert(productImages).values({
    productId,
    url,
    alt: s(formData.get("alt")) || null,
    isPrimary: existing.length === 0,
    sortOrder: existing.length * 10,
  });
  revalidatePath(`/admin/products/${productId}`);
}

export async function replaceProductImageAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const productId = s(formData.get("productId"));
  const file = formData.get("image") as File | null;
  if (!id || !productId || !file || !(file instanceof File) || file.size === 0) return;
  if (file.size > 8 * 1024 * 1024) {
    redirect(`/admin/products/${productId}?error=image-size`);
  }
  const url = await uploadProductImage(productId, file);
  await db
    .update(productImages)
    .set({ url, alt: s(formData.get("alt")) || null })
    .where(eq(productImages.id, id));
  revalidatePath(`/admin/products/${productId}`);
}

export async function setPrimaryImageAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const productId = s(formData.get("productId"));
  if (!id || !productId) return;
  await db
    .update(productImages)
    .set({ isPrimary: false })
    .where(eq(productImages.productId, productId));
  await db
    .update(productImages)
    .set({ isPrimary: true })
    .where(eq(productImages.id, id));
  revalidatePath(`/admin/products/${productId}`);
}

/**
 * Bound-arg variant of setPrimary so the gallery form can use
 * `formAction={setPrimaryImageById.bind(null, img.id)}` without polluting the
 * shared form data with per-image hidden ids. Saves any pending alt / sort
 * edits in the same submission so users don't lose unsaved changes.
 */
export async function setPrimaryImageById(imageId: string, formData: FormData) {
  await requireAdmin();
  const productId = s(formData.get("productId"));
  if (!imageId || !productId) return;
  await applyImageDetailUpdates(formData, productId);
  await db
    .update(productImages)
    .set({ isPrimary: false })
    .where(eq(productImages.productId, productId));
  await db
    .update(productImages)
    .set({ isPrimary: true })
    .where(eq(productImages.id, imageId));
  revalidatePath(`/admin/products/${productId}`);
}

/**
 * Bulk-save alt text + sort order across every image on a product. Reads
 * `alt_<id>` and `sort_<id>` keys; ignores anything else. Scoped to the
 * product id so submitting an unrelated image id is a no-op.
 */
export async function bulkUpdateImageDetailsAction(formData: FormData) {
  await requireAdmin();
  const productId = s(formData.get("productId"));
  if (!productId) return;
  await applyImageDetailUpdates(formData, productId);
  revalidatePath(`/admin/products/${productId}`);
}

async function applyImageDetailUpdates(formData: FormData, productId: string) {
  const updates = new Map<string, { alt?: string | null; sort?: number }>();
  for (const [key, value] of formData.entries()) {
    const altMatch = key.match(/^alt_(.+)$/);
    const sortMatch = key.match(/^sort_(.+)$/);
    if (altMatch) {
      const id = altMatch[1];
      const alt = String(value).trim() || null;
      updates.set(id, { ...(updates.get(id) ?? {}), alt });
    } else if (sortMatch) {
      const id = sortMatch[1];
      const n = Number(String(value).trim());
      updates.set(id, {
        ...(updates.get(id) ?? {}),
        sort: Number.isFinite(n) ? n : 0,
      });
    }
  }

  for (const [id, u] of updates.entries()) {
    await db
      .update(productImages)
      .set({
        ...(u.alt !== undefined ? { alt: u.alt } : {}),
        ...(u.sort !== undefined ? { sortOrder: u.sort } : {}),
      })
      .where(
        and(eq(productImages.id, id), eq(productImages.productId, productId)),
      );
  }
}

export async function reorderProductImageAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const productId = s(formData.get("productId"));
  const sortOrder = nullableInt(formData.get("sortOrder"));
  if (!id || !productId || sortOrder == null) return;
  await db
    .update(productImages)
    .set({ sortOrder })
    .where(eq(productImages.id, id));
  revalidatePath(`/admin/products/${productId}`);
}

export async function updateImageAltAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const productId = s(formData.get("productId"));
  if (!id) return;
  await db
    .update(productImages)
    .set({ alt: s(formData.get("alt")) || null })
    .where(eq(productImages.id, id));
  if (productId) revalidatePath(`/admin/products/${productId}`);
}

export async function deleteProductImageAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const productId = s(formData.get("productId"));
  if (!id) return;
  await deleteImageInternal(id, productId);
}

/** Bound-arg variant; see `setPrimaryImageById` for rationale. */
export async function deleteProductImageById(imageId: string, formData: FormData) {
  await requireAdmin();
  const productId = s(formData.get("productId"));
  if (!imageId) return;
  if (productId) await applyImageDetailUpdates(formData, productId);
  await deleteImageInternal(imageId, productId);
}

async function deleteImageInternal(id: string, productId: string) {
  // If we delete the primary, promote another one if any remain.
  const target = await db.query.productImages.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  await db.delete(productImages).where(eq(productImages.id, id));
  if (target?.isPrimary && productId) {
    const remaining = await db.query.productImages.findFirst({
      where: (t, { eq }) => eq(t.productId, productId),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)],
    });
    if (remaining) {
      await db
        .update(productImages)
        .set({ isPrimary: true })
        .where(eq(productImages.id, remaining.id));
    }
  }
  if (productId) revalidatePath(`/admin/products/${productId}`);
}

// ---------------------------------------------------------------------------
// Variants — unchanged from before
// ---------------------------------------------------------------------------

export async function addVariantAction(formData: FormData) {
  await requireAdmin();
  const productId = s(formData.get("productId"));
  const label = s(formData.get("label"));
  const priceCents = dollarsToCents(formData.get("priceUsd"));
  if (!productId || !label || priceCents == null) return;
  const existing = await db.query.productVariants.findMany({
    where: (t, { eq }) => eq(t.productId, productId),
  });
  await db.insert(productVariants).values({
    productId,
    label,
    priceCents,
    weightOz: nullableInt(formData.get("weightOz")),
    sortOrder: nullableInt(formData.get("sortOrder")) ?? existing.length * 10,
    isDefault: existing.length === 0,
    isAvailable: true,
  });
  revalidatePath(`/admin/products/${productId}`);
}

export async function updateVariantAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const productId = s(formData.get("productId"));
  if (!id || !productId) return;
  const priceCents = dollarsToCents(formData.get("priceUsd"));
  await db
    .update(productVariants)
    .set({
      label: s(formData.get("label")),
      priceCents: priceCents ?? 0,
      weightOz: nullableInt(formData.get("weightOz")),
      sortOrder: nullableInt(formData.get("sortOrder")) ?? 0,
      isAvailable: formData.get("isAvailable") === "on",
    })
    .where(eq(productVariants.id, id));
  revalidatePath(`/admin/products/${productId}`);
}

export async function setDefaultVariantAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const productId = s(formData.get("productId"));
  if (!id || !productId) return;
  await db
    .update(productVariants)
    .set({ isDefault: false })
    .where(eq(productVariants.productId, productId));
  await db
    .update(productVariants)
    .set({ isDefault: true })
    .where(eq(productVariants.id, id));
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteVariantAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const productId = s(formData.get("productId"));
  if (!id) return;
  await db.delete(productVariants).where(eq(productVariants.id, id));
  if (productId) revalidatePath(`/admin/products/${productId}`);
}
