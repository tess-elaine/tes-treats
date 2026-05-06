"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { holidays } from "@/db/schema/drops";
import { requireAdmin } from "@/lib/auth-helpers";

function s(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

export async function createHolidayAction(formData: FormData) {
  await requireAdmin();
  const name = s(formData.get("name"));
  const date = s(formData.get("date"));
  if (!name || !date) redirect("/admin/holidays/new?error=missing");

  // De-duplicate on (name, date) so the yearly seed is idempotent.
  const existing = await db.query.holidays.findFirst({
    where: (t, { and, eq }) => and(eq(t.name, name), eq(t.date, date)),
  });
  if (existing) {
    revalidatePath("/admin/holidays");
    redirect(`/admin/holidays/${existing.id}`);
  }

  const [created] = await db
    .insert(holidays)
    .values({
      name,
      date,
      isRecurring: formData.get("isRecurring") === "on",
      isHidden: formData.get("isHidden") === "on",
      notes: s(formData.get("notes")) || null,
    })
    .returning({ id: holidays.id });
  revalidatePath("/admin/holidays");
  redirect(`/admin/holidays/${created.id}`);
}

export async function updateHolidayAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  await db
    .update(holidays)
    .set({
      name: s(formData.get("name")),
      date: s(formData.get("date")),
      isRecurring: formData.get("isRecurring") === "on",
      isHidden: formData.get("isHidden") === "on",
      notes: s(formData.get("notes")) || null,
    })
    .where(eq(holidays.id, id));
  revalidatePath("/admin/holidays");
  redirect(`/admin/holidays/${id}`);
}

export async function toggleHolidayHiddenAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  await db
    .update(holidays)
    .set({ isHidden: sql`NOT ${holidays.isHidden}` })
    .where(eq(holidays.id, id));
  revalidatePath("/admin/holidays");
}

export async function deleteHolidayAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  await db.delete(holidays).where(eq(holidays.id, id));
  revalidatePath("/admin/holidays");
  redirect("/admin/holidays");
}
