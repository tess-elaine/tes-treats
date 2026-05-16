"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { productCategories, products } from "@/db/schema/catalog";
import { requireAdmin } from "@/lib/auth-helpers";

function s(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}
function nullableInt(v: FormDataEntryValue | null) {
  const n = Number(s(v));
  return Number.isFinite(n) ? n : null;
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

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const name = s(formData.get("name"));
  if (!name) redirect("/admin/categories/new?error=name");
  const slug = s(formData.get("slug")) || slugify(name);
  const existing = await db.query.productCategories.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  });
  if (existing) redirect("/admin/categories/new?error=slug");

  const [created] = await db
    .insert(productCategories)
    .values({
      name,
      slug,
      description: s(formData.get("description")) || null,
      sortOrder: nullableInt(formData.get("sortOrder")) ?? 0,
      isActive: formData.get("isActive") === "on",
    })
    .returning({ id: productCategories.id });

  revalidatePath("/admin/categories");
  redirect(`/admin/categories/${created.id}`);
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  const name = s(formData.get("name"));
  const slug = s(formData.get("slug")) || slugify(name);

  await db
    .update(productCategories)
    .set({
      name,
      slug,
      description: s(formData.get("description")) || null,
      sortOrder: nullableInt(formData.get("sortOrder")) ?? 0,
      isActive: formData.get("isActive") === "on",
    })
    .where(eq(productCategories.id, id));

  revalidatePath("/admin/categories");
  redirect(`/admin/categories/${id}`);
}

export async function toggleCategoryActiveAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  await db
    .update(productCategories)
    .set({ isActive: sql`NOT ${productCategories.isActive}` })
    .where(eq(productCategories.id, id));
  revalidatePath("/admin/categories");
}

/** Save category details without redirecting — used by CategoryEditClient save bar. */
export async function saveCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  const name = s(formData.get("name"));
  const slug = s(formData.get("slug")) || slugify(name);

  await db
    .update(productCategories)
    .set({
      name,
      slug,
      description: s(formData.get("description")) || null,
      sortOrder: nullableInt(formData.get("sortOrder")) ?? 0,
      isActive: formData.get("isActive") === "on",
    })
    .where(eq(productCategories.id, id));

  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${id}`);
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;

  // Refuse to delete a category that still has products attached — Tess would
  // otherwise get an opaque DB error from the FK ON DELETE RESTRICT.
  const [{ c: usageCount }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.categoryId, id));
  if (usageCount > 0) {
    redirect(`/admin/categories/${id}?error=in-use`);
  }

  await db.delete(productCategories).where(eq(productCategories.id, id));
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}
