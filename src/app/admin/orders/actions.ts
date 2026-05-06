"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, type orderStatus } from "@/db/schema/orders";
import { requireAdmin } from "@/lib/auth-helpers";
import { getStripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";

type Status = (typeof orderStatus.enumValues)[number];
const STATUSES: Status[] = [
  "pending",
  "paid",
  "in_kitchen",
  "ready",
  "fulfilled",
  "cancelled",
  "refunded",
];

function s(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

export async function setOrderStatusAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const status = s(formData.get("status")) as Status;
  if (!id || !STATUSES.includes(status)) return;

  const order = await db.query.orders.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!order) return;

  const update: Record<string, unknown> = { status };
  if (status === "paid" && !order.paidAt) update.paidAt = new Date();
  if (status === "fulfilled" && !order.fulfilledAt) update.fulfilledAt = new Date();

  await db.update(orders).set(update).where(eq(orders.id, id));
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");

  // Customer-facing status nudge — only for "ready" since that's the most
  // actionable transition. Other states are internal.
  if (status === "ready" && order.email) {
    await sendEmail({
      to: order.email,
      subject: `TES Treats — order ${order.number} is ready`,
      html: `
        <p>Hi,</p>
        <p>Your order <strong>${order.number}</strong> is baked and ready for ${order.fulfillment === "pickup" ? "pickup" : "delivery"}.</p>
        ${order.fulfillment === "pickup" ? "<p>Tess will message you about when to swing by.</p>" : "<p>Tess will be on her way.</p>"}
        <p>— TES Treats</p>
      `,
    });
  }
}

export async function refundOrderAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  if (!id) return;
  const order = await db.query.orders.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!order) return;

  const stripe = getStripe();
  if (stripe && order.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
      });
    } catch (e) {
      console.error("[stripe] refund failed", e);
      redirect(`/admin/orders/${id}?error=refund`);
    }
  }
  // Even in dev / no-Stripe, mark refunded so the admin flow is testable.
  await db
    .update(orders)
    .set({ status: "refunded" })
    .where(eq(orders.id, id));

  if (order.email) {
    await sendEmail({
      to: order.email,
      subject: `TES Treats — refund issued for order ${order.number}`,
      html: `
        <p>Hi,</p>
        <p>We issued a refund for your order <strong>${order.number}</strong>. Stripe will return the funds to your card within a few business days.</p>
        <p>— TES Treats</p>
      `,
    });
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function updateAdminNotesAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData.get("id"));
  const adminNotes = s(formData.get("adminNotes")) || null;
  if (!id) return;
  await db
    .update(orders)
    .set({ adminNotes })
    .where(eq(orders.id, id));
  revalidatePath(`/admin/orders/${id}`);
}
