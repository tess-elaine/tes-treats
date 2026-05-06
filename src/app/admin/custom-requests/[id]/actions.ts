"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customRequests } from "@/db/schema/custom_requests";
import { requireAdmin } from "@/lib/auth-helpers";
import { getStripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";

export async function setQuoteAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!id || !Number.isFinite(amount) || amount <= 0) return;

  const cents = Math.round(amount * 100);
  const request = await db.query.customRequests.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!request) return;

  // Create or replace a Stripe Payment Link tied to this quote. We make a
  // brand-new product+price each time the quote changes — simpler than
  // reusing and updating existing ones, and Stripe doesn't charge for it.
  const stripe = getStripe();
  let paymentLinkUrl: string | null = null;
  let paymentLinkId: string | null = null;

  if (stripe) {
    try {
      const product = await stripe.products.create({
        name: `Custom Request ${request.number}`,
        description: notes ?? request.description.slice(0, 250),
        metadata: { customRequestId: request.id },
      });
      const price = await stripe.prices.create({
        unit_amount: cents,
        currency: "usd",
        product: product.id,
      });
      const link = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: {
          customRequestId: request.id,
          customRequestNumber: request.number,
        },
        after_completion: {
          type: "hosted_confirmation",
          hosted_confirmation: {
            custom_message:
              "Thanks! Your payment is confirmed. Tess will reach out about timing.",
          },
        },
      });
      paymentLinkUrl = link.url;
      paymentLinkId = link.id;
    } catch (err) {
      console.error("[stripe] payment-link create failed", err);
      redirect(`/admin/custom-requests/${id}?error=stripe`);
    }
  } else {
    // Dev / no-Stripe mode: provide a fake URL so the rest of the flow
    // (emails, status display) still exercises end-to-end.
    paymentLinkUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/orders/quote-${request.number}/dev-pay`;
    paymentLinkId = `dev_link_${request.number}`;
  }

  await db
    .update(customRequests)
    .set({
      status: "quoted",
      quoteCents: cents,
      quoteNotes: notes,
      stripePaymentLinkUrl: paymentLinkUrl,
      stripePaymentLinkId: paymentLinkId,
      updatedAt: new Date(),
    })
    .where(eq(customRequests.id, id));

  await sendEmail({
    to: request.email,
    subject: `TES Treats — your quote for ${request.number}`,
    html: `
      <p>Hi${request.name ? " " + request.name.split(" ")[0] : ""},</p>
      <p>Tess put together a quote for your custom request:</p>
      <p><strong>$${(cents / 100).toFixed(2)}</strong></p>
      ${notes ? `<p style="white-space:pre-wrap">${notes.replace(/</g, "&lt;")}</p>` : ""}
      <p>To lock it in, follow this link:</p>
      <p><a href="${paymentLinkUrl}" style="background:#77553d;color:#fff;padding:12px 20px;text-decoration:none;font-family:Epilogue,sans-serif;font-weight:700;display:inline-block;">Pay quote</a></p>
      <p style="font-size:12px;color:#827470;">Reply to this email if anything's off — Tess will adjust.</p>
    `,
  });

  revalidatePath(`/admin/custom-requests/${id}`);
  revalidatePath("/admin/custom-requests");
  redirect(`/admin/custom-requests/${id}`);
}

export async function declineRequestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return;

  const request = await db.query.customRequests.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!request) return;

  await db
    .update(customRequests)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(customRequests.id, id));

  await sendEmail({
    to: request.email,
    subject: `TES Treats — about your custom request ${request.number}`,
    html: `
      <p>Hi${request.name ? " " + request.name.split(" ")[0] : ""},</p>
      <p>Thanks for thinking of TES Treats. Unfortunately Tess isn't able to take this one on.</p>
      ${reason ? `<p style="white-space:pre-wrap">${reason.replace(/</g, "&lt;")}</p>` : ""}
      <p>If your timing is flexible, you're welcome to reach back out — and the catalog is always open.</p>
    `,
  });

  revalidatePath(`/admin/custom-requests/${id}`);
  redirect(`/admin/custom-requests/${id}`);
}

export async function markStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  const valid = [
    "submitted","reviewing","needs_info","quoted","declined","paid","in_kitchen","fulfilled","cancelled",
  ] as const;
  type Status = (typeof valid)[number];
  if (!valid.includes(status as Status)) return;

  await db
    .update(customRequests)
    .set({ status: status as Status, updatedAt: new Date() })
    .where(eq(customRequests.id, id));
  revalidatePath(`/admin/custom-requests/${id}`);
  redirect(`/admin/custom-requests/${id}`);
}
