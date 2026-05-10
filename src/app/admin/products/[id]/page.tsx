import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { db } from "@/db";
import {
  listCategories,
  imagesForProduct,
  categoryForProduct,
} from "@/lib/products";
import {
  deleteProductAction,
  addProductImageAction,
  bulkUpdateImageDetailsAction,
  setPrimaryImageById,
  deleteProductImageById,
} from "../actions";
import { ProductEditClient } from "./ProductEditClient";

export const dynamic = "force-dynamic";

export default async function AdminProductDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const product = await db.query.products.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!product) notFound();

  const [variants, images, categories, currentCategory] = await Promise.all([
    db.query.productVariants.findMany({
      where: (t, { eq }) => eq(t.productId, product.id),
      orderBy: (t, { desc, asc }) => [desc(t.isDefault), asc(t.sortOrder)],
    }),
    imagesForProduct(product.id),
    listCategories(),
    categoryForProduct(product.id),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/products"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All products
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Product
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
            {product.name}
          </h1>
          <Link
            href={`/shop/${product.slug}`}
            className="mt-1 inline-block text-sm text-on-surface-variant hover:text-primary"
          >
            /shop/{product.slug}
          </Link>
        </div>
        <form action={deleteProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <ConfirmSubmit
            message={`Delete "${product.name}" permanently? Past orders keep their snapshots, but the product, its variants, and all images are removed.`}
            className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
          >
            Delete product
          </ConfirmSubmit>
        </form>
      </header>

      {error === "image-size" ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          Image is too large (max 8 MB).
        </p>
      ) : error === "category" ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          Pick a category from the list.{" "}
          <Link href="/admin/categories/new" className="underline">
            Create one
          </Link>{" "}
          if it doesn&rsquo;t exist yet.
        </p>
      ) : null}

      {/*
        Details + Variants are client-managed with a unified floating save bar.
        Key on updatedAt so the component remounts with fresh data after each save.
      */}
      <ProductEditClient
        key={product.updatedAt?.getTime() ?? 0}
        product={product}
        variants={variants}
        categories={categories}
        currentCategorySlug={currentCategory?.slug}
      />

      {/* ---------------- Image gallery ---------------- */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-headline text-xl font-bold text-primary">Images</h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            {images.length} {images.length === 1 ? "image" : "images"} ·{" "}
            primary marked with ★
          </span>
        </div>

        {images.length > 0 ? (
          <form action={bulkUpdateImageDetailsAction} className="mt-4">
            <input type="hidden" name="productId" value={product.id} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="rounded-md bg-surface-container-low p-3"
                >
                  <div className="relative aspect-square overflow-hidden rounded-md bg-surface-container-high">
                    <Image
                      src={img.url}
                      alt={img.alt ?? "Product photo"}
                      fill
                      sizes="240px"
                      className="object-cover"
                    />
                    {img.isPrimary ? (
                      <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 font-label text-[0.625rem] font-bold uppercase tracking-[0.12em] text-on-primary">
                        ★ Primary
                      </span>
                    ) : null}
                  </div>

                  <label className="mt-3 block">
                    <span className="font-label text-[0.625rem] uppercase tracking-[0.12em] text-on-surface-variant">
                      Alt text
                    </span>
                    <input
                      name={`alt_${img.id}`}
                      defaultValue={img.alt ?? ""}
                      placeholder="Describe the photo"
                      className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-2 py-1.5 font-body text-xs text-on-surface focus:bg-primary-fixed focus:outline-none"
                    />
                  </label>

                  <label className="mt-2 flex items-center gap-2">
                    <span className="font-label text-[0.625rem] uppercase tracking-[0.12em] text-on-surface-variant">
                      Sort
                    </span>
                    <input
                      name={`sort_${img.id}`}
                      type="number"
                      defaultValue={img.sortOrder}
                      className="ghost-border w-20 rounded-md bg-surface-container-high px-2 py-1.5 font-body text-xs text-on-surface text-center focus:bg-primary-fixed focus:outline-none"
                    />
                  </label>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    {!img.isPrimary ? (
                      <button
                        type="submit"
                        formAction={setPrimaryImageById.bind(null, img.id)}
                        className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                      >
                        Make primary
                      </button>
                    ) : (
                      <span />
                    )}
                    <ConfirmSubmit
                      message="Delete this image permanently?"
                      formAction={deleteProductImageById.bind(null, img.id)}
                      className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
                    >
                      Delete
                    </ConfirmSubmit>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <p className="text-xs text-on-surface-variant">
                Save alt text + sort order for all images.
              </p>
              <BiteButton size="md" variant="ghost">
                Save details
              </BiteButton>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-on-surface-variant">
            No images yet. Upload your first one below.
          </p>
        )}

        <details className="group mt-8 rounded-md bg-primary-fixed open:p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-headline text-base font-bold text-primary hover:underline group-open:mb-4 group-open:p-0">
            <span aria-hidden className="font-mono text-lg">
              +
            </span>
            Add image(s) to gallery
          </summary>
          <form
            action={addProductImageAction}
            encType="multipart/form-data"
            className="space-y-3"
          >
            <input type="hidden" name="productId" value={product.id} />
            <p className="text-xs text-on-surface-variant">
              Pick or drop multiple files at once. Each file becomes{" "}
              <code>{product.slug}-XXXXXX.webp</code> after auto-rotate, resize
              to 1600px max, and WebP conversion. The alt text below applies to
              every photo in this batch — adjust per-image later if needed.
              Replace = delete + re-upload.
            </p>
            <ImageUploadField name="image" multiple required />
            <input
              name="alt"
              placeholder="Alt text (e.g. 'Monster cookies — peanut butter, oats, M&Ms')"
              className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-sm"
            />
            <BiteButton size="lg" className="w-full">
              Upload to gallery
            </BiteButton>
          </form>
        </details>

        <p className="mt-4 text-xs text-on-surface-variant">
          The primary image powers thumbnails everywhere (cart, list, homepage).
          The rest form the gallery on the public product page.
        </p>
      </NibbleCard>
    </div>
  );
}
