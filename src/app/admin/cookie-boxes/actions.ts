"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cookieBoxes, cookieBoxItems } from "@/db/schema/drops";
import { requireAdmin } from "@/lib/auth-helpers";

function s(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

/** Save box details without redirecting — used by CookieBoxEditClient save bar. */
export async function saveBoxDetailsAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;

  await db
    .update(cookieBoxes)
    .set({
      name: s(formData.get("name")),
      tagline: s(formData.get("tagline")) || null,
      description: s(formData.get("description")) || null,
      notes: s(formData.get("notes")) || null,
      isHidden: formData.get("isHidden") === "on",
    })
    .where(eq(cookieBoxes.id, id));

  revalidatePath("/admin/cookie-boxes");
  revalidatePath(`/admin/cookie-boxes/${id}`);
}

/** Reorder box items after drag-and-drop — called with IDs in new display order. */
export async function reorderBoxItemsAction(cookieBoxId: string, orderedIds: string[]) {
  await requireAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(cookieBoxItems)
      .set({ sortOrder: i * 10 })
      .where(eq(cookieBoxItems.id, orderedIds[i]));
  }
  revalidatePath(`/admin/cookie-boxes/${cookieBoxId}`);
}

/** Add a cookie to a box and return the created item's ID + sortOrder. */
export async function addBoxItemReturnAction(cookieBoxId: string, productId: string) {
  await requireAdmin();
  const existing = await db.query.cookieBoxItems.findMany({
    where: (t, { eq }) => eq(t.cookieBoxId, cookieBoxId),
  });
  const [created] = await db
    .insert(cookieBoxItems)
    .values({ cookieBoxId, productId, sortOrder: existing.length * 10 })
    .returning({ id: cookieBoxItems.id, sortOrder: cookieBoxItems.sortOrder });
  revalidatePath(`/admin/cookie-boxes/${cookieBoxId}`);
  return created;
}

/** Remove a cookie from a box (direct args, no FormData). */
export async function removeBoxItemAction(itemId: string, cookieBoxId: string) {
  await requireAdmin();
  await db.delete(cookieBoxItems).where(eq(cookieBoxItems.id, itemId));
  revalidatePath(`/admin/cookie-boxes/${cookieBoxId}`);
}

export async function createBoxAction(formData: FormData) {
  await requireAdmin();
  const name = s(formData.get("name"));
  if (!name) redirect("/admin/cookie-boxes/new?error=missing");

  const [created] = await db
    .insert(cookieBoxes)
    .values({
      name,
      tagline: s(formData.get("tagline")) || null,
      description: s(formData.get("description")) || null,
      notes: s(formData.get("notes")) || null,
      isHidden: formData.get("isHidden") === "on",
    })
    .returning({ id: cookieBoxes.id });

  revalidatePath("/admin/cookie-boxes");
  redirect(`/admin/cookie-boxes/${created.id}`);
}

export async function updateBoxAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;

  await db
    .update(cookieBoxes)
    .set({
      name: s(formData.get("name")),
      tagline: s(formData.get("tagline")) || null,
      description: s(formData.get("description")) || null,
      notes: s(formData.get("notes")) || null,
      isHidden: formData.get("isHidden") === "on",
    })
    .where(eq(cookieBoxes.id, id));

  revalidatePath("/admin/cookie-boxes");
  revalidatePath(`/admin/cookie-boxes/${id}`);
  redirect(`/admin/cookie-boxes/${id}`);
}

export async function deleteBoxAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  await db.delete(cookieBoxes).where(eq(cookieBoxes.id, id));
  revalidatePath("/admin/cookie-boxes");
  redirect("/admin/cookie-boxes");
}

export async function addBoxItemAction(formData: FormData) {
  await requireAdmin();
  const cookieBoxId = s(formData.get("cookieBoxId"));
  const productId = s(formData.get("productId"));
  if (!cookieBoxId || !productId) return;

  const existing = await db.query.cookieBoxItems.findMany({
    where: (t, { eq }) => eq(t.cookieBoxId, cookieBoxId),
  });
  await db.insert(cookieBoxItems).values({
    cookieBoxId,
    productId,
    sortOrder: existing.length,
  });
  revalidatePath(`/admin/cookie-boxes/${cookieBoxId}`);
}

export async function updateBoxItemAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const cookieBoxId = s(formData.get("cookieBoxId"));
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!id) return;

  await db
    .update(cookieBoxItems)
    .set({ sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 })
    .where(eq(cookieBoxItems.id, id));

  revalidatePath(`/admin/cookie-boxes/${cookieBoxId}`);
}

export async function deleteBoxItemAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const cookieBoxId = s(formData.get("cookieBoxId"));
  if (!id) return;
  await db.delete(cookieBoxItems).where(eq(cookieBoxItems.id, id));
  revalidatePath(`/admin/cookie-boxes/${cookieBoxId}`);
}
