import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { CategoryTypeahead } from "@/components/ui/category-typeahead";
import { db } from "@/db";
import { formatCents } from "@/lib/format";
import {
  listCategories,
  imagesForProduct,
  categoryForProduct,
} from "@/lib/products";
import {
  updateProductAction,
  deleteProductAction,
  addVariantAction,
  updateVariantAction,
  setDefaultVariantAction,
  deleteVariantAction,
  addProductImageAction,
  replaceProductImageAction,
  setPrimaryImageAction,
  reorderProductImageAction,
  updateImageAltAction,
  deleteProductImageAction,
} from "../actions";

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
          <Link href={`/shop/${product.slug}`} className="mt-1 inline-block text-sm text-on-surface-variant hover:text-primary">
            /shop/{product.slug}
          </Link>
        </div>
        <form action={deleteProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <button
            type="submit"
            className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
          >
            Delete product
          </button>
        </form>
      </header>

      {error === "image-size" ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          Image is too large (max 8 MB).
        </p>
      ) : error === "category" ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          Pick a category from the list. <Link href="/admin/categories/new" className="underline">Create one</Link> if it doesn&rsquo;t exist yet.
        </p>
      ) : null}

      <NibbleCard bite="none" className="p-6 md:p-10">
        <h2 className="font-headline text-xl font-bold text-primary">Details</h2>
        <form action={updateProductAction} className="mt-4 space-y-5">
          <input type="hidden" name="id" value={product.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Name" defaultValue={product.name} required />
            <Field name="slug" label="URL slug" defaultValue={product.slug} />
          </div>
          <Field name="shortDescription" label="Short description" defaultValue={product.shortDescription ?? ""} />
          <TextArea name="description" label="Full description" rows={5} defaultValue={product.description ?? ""} />
          <div className="grid gap-4 md:grid-cols-3">
            <CategoryTypeahead categories={categories} defaultValue={currentCategory?.slug} required />
            <Field name="sortOrder" type="number" label="Sort order" defaultValue={String(product.sortOrder)} />
            <Field
              name="ingredientChips"
              label="Chip callouts (comma-separated)"
              defaultValue={(product.ingredientChips ?? []).join(", ")}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <Toggle name="isAvailable" label="Available on /shop" defaultChecked={product.isAvailable} />
            <Toggle name="isFeatured" label="Featured on homepage" defaultChecked={product.isFeatured} />
          </div>

          <BiteButton size="lg">Save details</BiteButton>
        </form>
      </NibbleCard>

      {/* ---------------- Image gallery ---------------- */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-headline text-xl font-bold text-primary">Images</h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            {images.length} {images.length === 1 ? "image" : "images"} ·{" "}
            primary marked with ★
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="rounded-md bg-surface-container-low p-3"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-surface-container-high">
                <Image src={img.url} alt={img.alt ?? "Product photo"} fill sizes="240px" className="object-cover" />
                {img.isPrimary ? (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 font-label text-[0.625rem] font-bold uppercase tracking-[0.12em] text-on-primary">
                    ★ Primary
                  </span>
                ) : null}
              </div>

              <form action={replaceProductImageAction} encType="multipart/form-data" className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="id" value={img.id} />
                <input type="hidden" name="productId" value={product.id} />
                <label className="block">
                  <span className="sr-only">Replace this image</span>
                  <input
                    type="file"
                    accept="image/*"
                    name="image"
                    className="block w-full font-body text-xs text-on-surface file:mr-2 file:rounded-md file:border-0 file:bg-secondary-container file:px-3 file:py-1.5 file:font-headline file:font-bold file:text-on-secondary-container hover:file:bg-secondary-fixed"
                  />
                </label>
                <button
                  type="submit"
                  className="self-start font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                >
                  Replace image
                </button>
              </form>

              <form action={updateImageAltAction} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="id" value={img.id} />
                <input type="hidden" name="productId" value={product.id} />
                <input
                  name="alt"
                  defaultValue={img.alt ?? ""}
                  placeholder="Alt text"
                  className="ghost-border flex-1 rounded-md bg-surface-container-high px-2 py-1 font-body text-xs"
                />
                <button
                  type="submit"
                  className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                >
                  Save
                </button>
              </form>

              <form action={reorderProductImageAction} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="id" value={img.id} />
                <input type="hidden" name="productId" value={product.id} />
                <label className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">Sort</label>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={img.sortOrder}
                  className="ghost-border w-16 rounded-md bg-surface-container-high px-2 py-1 font-body text-xs text-center"
                />
                <button type="submit" className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline">
                  Set
                </button>
              </form>

              <div className="mt-3 flex justify-between">
                {!img.isPrimary ? (
                  <form action={setPrimaryImageAction}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <button
                      type="submit"
                      className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                    >
                      Make primary
                    </button>
                  </form>
                ) : (
                  <span />
                )}
                <form action={deleteProductImageAction}>
                  <input type="hidden" name="id" value={img.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <button
                    type="submit"
                    className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}

          <form
            action={addProductImageAction}
            encType="multipart/form-data"
            className="flex flex-col gap-3 rounded-md bg-surface-container-lowest p-4 ghost-border"
          >
            <input type="hidden" name="productId" value={product.id} />
            <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
              Add a new image
            </p>
            <input
              type="file"
              accept="image/*"
              name="image"
              required
              className="block w-full font-body text-sm text-on-surface file:mr-3 file:rounded-md file:border-0 file:bg-secondary-container file:px-4 file:py-2 file:font-headline file:font-bold file:text-on-secondary-container hover:file:bg-secondary-fixed"
            />
            <input
              name="alt"
              placeholder="Alt text (optional)"
              className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-sm"
            />
            <BiteButton size="md">+ Upload</BiteButton>
          </form>
        </div>
        <p className="mt-4 text-xs text-on-surface-variant">
          The primary image powers thumbnails everywhere (cart, list, homepage). The rest form
          the gallery on the public product page.
        </p>
      </NibbleCard>

      {/* ---------------- Variants ---------------- */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-headline text-xl font-bold text-primary">Variants</h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            {variants.length} {variants.length === 1 ? "variant" : "variants"}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {variants.map((v) => (
            <form
              key={v.id}
              action={updateVariantAction}
              className="grid items-end gap-3 rounded-md bg-surface-container-low p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]"
            >
              <input type="hidden" name="id" value={v.id} />
              <input type="hidden" name="productId" value={product.id} />
              <Field name="label" label="Label" defaultValue={v.label} />
              <Field name="priceUsd" type="number" label="Price ($)" defaultValue={(v.priceCents / 100).toFixed(2)} />
              <Field name="weightOz" type="number" label="Weight (oz)" defaultValue={String(v.weightOz ?? "")} />
              <Field name="sortOrder" type="number" label="Sort" defaultValue={String(v.sortOrder)} />
              <Toggle name="isAvailable" label="Active" defaultChecked={v.isAvailable} />
              <button
                type="submit"
                className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
              >
                Save
              </button>
              <div className="sm:col-span-6 flex items-center justify-between text-xs">
                <span className={v.isDefault ? "font-medium text-primary" : "text-on-surface-variant"}>
                  {v.isDefault ? "★ Default variant" : "Not default"}
                </span>
                <div className="flex gap-3">
                  {!v.isDefault ? (
                    <DangerForm action={setDefaultVariantAction} idValue={v.id} productId={product.id} label="Make default" />
                  ) : null}
                  <DangerForm action={deleteVariantAction} idValue={v.id} productId={product.id} label="Delete" danger />
                </div>
              </div>
            </form>
          ))}

          <form action={addVariantAction} className="grid items-end gap-3 rounded-md bg-surface-container-lowest p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <input type="hidden" name="productId" value={product.id} />
            <Field name="label" label="Add a variant — Label" placeholder="Dozen" />
            <Field name="priceUsd" type="number" label="Price ($)" placeholder="24.00" />
            <Field name="weightOz" type="number" label="Weight (oz)" />
            <Field name="sortOrder" type="number" label="Sort" defaultValue={String(variants.length * 10)} />
            <button type="submit" className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline">
              + Add variant
            </button>
          </form>
        </div>
      </NibbleCard>
    </div>
  );
}

function DangerForm({
  action, idValue, productId, label, danger,
}: {
  action: (fd: FormData) => Promise<void>;
  idValue: string; productId: string; label: string; danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={idValue} />
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        className={`font-label text-xs uppercase tracking-[0.12em] ${
          danger ? "text-on-error-container hover:underline" : "text-primary hover:underline"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function Field({
  name, label, type = "text", required, placeholder, defaultValue,
}: {
  name: string; label: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string;
}) {
  const isMoney = name.endsWith("Usd") || name.includes("price");
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={isMoney && type === "number" ? "0.01" : undefined}
        min={isMoney && type === "number" ? 0 : undefined}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
function TextArea({ name, label, rows = 3, defaultValue }: { name: string; label: string; rows?: number; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
      <textarea name={name} rows={rows} defaultValue={defaultValue}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-primary" />
      <span>{label}</span>
    </label>
  );
}
