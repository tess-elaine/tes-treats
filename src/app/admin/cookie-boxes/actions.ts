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
