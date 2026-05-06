"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { drops, dropItems, dropSubscribers } from "@/db/schema/drops";
import { products } from "@/db/schema/catalog";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";

function nullableInt(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Reads a "12.34" dollar field and returns 1234 cents (or null when blank). */
function dollarsToCents(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function s(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

export async function createDropAction(formData: FormData) {
  await requireAdmin();

  const name = s(formData.get("name"));
  const slug = s(formData.get("slug"));
  if (!name || !slug) return;

  const opensAt = new Date(s(formData.get("opensAt")));
  const closesAt = new Date(s(formData.get("closesAt")));
  const fulfillmentStart = s(formData.get("fulfillmentStart"));
  const fulfillmentEnd = s(formData.get("fulfillmentEnd"));
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) return;

  const [created] = await db
    .insert(drops)
    .values({
      name,
      slug,
      tagline: s(formData.get("tagline")) || null,
      description: s(formData.get("description")) || null,
      holidayId: s(formData.get("holidayId")) || null,
      opensAt,
      closesAt,
      fulfillmentStart,
      fulfillmentEnd,
      assortedBoxPriceCents: dollarsToCents(formData.get("assortedBoxPriceUsd")),
      assortedBoxInventory: nullableInt(formData.get("assortedBoxInventory")),
      isPublished: formData.get("isPublished") === "on",
    })
    .returning({ id: drops.id });

  // Create drop_items for each chosen product, all sharing the default dozen price.
  const productIds = formData.getAll("dropItemProductIds").map(String);
  const defaultDozen = dollarsToCents(formData.get("defaultDozenPriceUsd")) ?? 2400;
  for (let i = 0; i < productIds.length; i++) {
    await db.insert(dropItems).values({
      dropId: created.id,
      productId: productIds[i],
      sortOrder: i,
      dozenPriceCents: defaultDozen,
    });
  }

  revalidatePath("/admin/drops");
  redirect(`/admin/drops/${created.id}`);
}

export async function addDropItemAction(formData: FormData) {
  await requireAdmin();
  const dropId = s(formData.get("dropId"));
  const productId = s(formData.get("productId"));
  const dozenPriceCents = dollarsToCents(formData.get("dozenPriceUsd"));
  if (!dropId || !productId || dozenPriceCents == null) return;

  const existing = await db.query.dropItems.findMany({
    where: (t, { eq }) => eq(t.dropId, dropId),
  });
  await db.insert(dropItems).values({
    dropId,
    productId,
    dozenPriceCents,
    dozenInventory: nullableInt(formData.get("dozenInventory")),
    sortOrder: existing.length,
  });
  revalidatePath(`/admin/drops/${dropId}`);
}

export async function updateDropItemAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const dropId = s(formData.get("dropId"));
  const dozenPriceCents = dollarsToCents(formData.get("dozenPriceUsd"));
  if (!id || dozenPriceCents == null) return;
  await db
    .update(dropItems)
    .set({
      dozenPriceCents,
      dozenInventory: nullableInt(formData.get("dozenInventory")),
      sortOrder: nullableInt(formData.get("sortOrder")) ?? 0,
    })
    .where(eq(dropItems.id, id));
  if (dropId) revalidatePath(`/admin/drops/${dropId}`);
}

export async function deleteDropItemAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const dropId = s(formData.get("dropId"));
  if (!id) return;
  await db.delete(dropItems).where(eq(dropItems.id, id));
  if (dropId) revalidatePath(`/admin/drops/${dropId}`);
}

export async function sendDropAnnouncementAction(formData: FormData) {
  await requireAdmin();
  const dropId = s(formData.get("dropId"));
  const force = formData.get("force") === "on";
  if (!dropId) return;

  const drop = await db.query.drops.findFirst({
    where: (t, { eq }) => eq(t.id, dropId),
  });
  if (!drop) return;
  if (drop.announcementSentAt && !force) {
    redirect(`/admin/drops/${dropId}?error=already-sent`);
  }

  const subscribers = await db
    .select({ email: dropSubscribers.email })
    .from(dropSubscribers)
    .where(isNull(dropSubscribers.unsubscribedAt));

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const subject = `TES Treats — ${drop.name} is live`;
  const html = `
    <div style="font-family:Newsreader,Georgia,serif;color:#1c1b1a;background:#fdf8f5;padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;padding:32px;">
        <h1 style="font-family:Epilogue,sans-serif;color:#77553d;font-size:28px;margin:0 0 16px 0;">${drop.name}</h1>
        ${drop.tagline ? `<p style="font-style:italic;color:#615c4e;">${drop.tagline}</p>` : ""}
        ${drop.description ? `<p style="font-size:16px;line-height:1.6;color:#504441;white-space:pre-wrap;">${drop.description.replace(/</g, "&lt;")}</p>` : ""}
        <p style="margin:24px 0;">
          <a href="${baseUrl}/drops/${drop.slug}" style="background:#77553d;color:#fff;padding:14px 24px;text-decoration:none;font-family:Epilogue,sans-serif;font-weight:700;display:inline-block;">See the box</a>
        </p>
        <p style="font-size:12px;color:#827470;">You're getting this because you signed up for the TES Treats nibbler list.</p>
      </div>
    </div>`;

  let sent = 0;
  for (const sub of subscribers) {
    try {
      await sendEmail({ to: sub.email, subject, html });
      sent++;
    } catch (e) {
      console.error("[drop-announce] send failed", sub.email, e);
    }
  }

  await db
    .update(drops)
    .set({ announcementSentAt: new Date() })
    .where(eq(drops.id, dropId));

  revalidatePath(`/admin/drops/${dropId}`);
  redirect(`/admin/drops/${dropId}?announced=${sent}`);
}

export async function updateDropAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;

  await db
    .update(drops)
    .set({
      name: s(formData.get("name")) || undefined,
      slug: s(formData.get("slug")) || undefined,
      tagline: s(formData.get("tagline")) || null,
      description: s(formData.get("description")) || null,
      holidayId: s(formData.get("holidayId")) || null,
      opensAt: new Date(s(formData.get("opensAt"))),
      closesAt: new Date(s(formData.get("closesAt"))),
      fulfillmentStart: s(formData.get("fulfillmentStart")),
      fulfillmentEnd: s(formData.get("fulfillmentEnd")),
      assortedBoxPriceCents: dollarsToCents(formData.get("assortedBoxPriceUsd")),
      assortedBoxInventory: nullableInt(formData.get("assortedBoxInventory")),
      isPublished: formData.get("isPublished") === "on",
      updatedAt: new Date(),
    })
    .where(eq(drops.id, id));

  revalidatePath(`/admin/drops/${id}`);
  revalidatePath("/admin/drops");
  redirect(`/admin/drops/${id}`);
}
