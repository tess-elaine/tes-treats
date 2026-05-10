/**
 * Stripe webhook handler.
 *
 * Authoritative path for marking orders paid. The /confirmation page also
 * does a fast-path check via session retrieval, but the webhook fires even
 * when the customer never returns (closed tab, etc.) so we can't rely on
 * the success-redirect alone.
 *
 * Configure in Stripe dashboard: send `checkout.session.completed` events
 * to https://your-host/api/webhooks/stripe and put the signing secret in
 * STRIPE_WEBHOOK_SECRET.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { customRequests } from "@/db/schema/custom_requests";
import { getStripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { formatCents } from "@/lib/format";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe disabled" }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook secret not set" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  // Stripe needs the raw body to verify the signature.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: "signature verification failed", detail: String(err) },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const sessionObj = event.data.object as Stripe.Checkout.Session;
      const orderId = sessionObj.metadata?.orderId;
      if (orderId && sessionObj.payment_status === "paid") {
        await db
          .update(orders)
          .set({
            status: "paid",
            paidAt: new Date(),
            stripePaymentIntentId:
              typeof sessionObj.payment_intent === "string"
                ? sessionObj.payment_intent
                : null,
          })
          .where(eq(orders.id, orderId));

        // Notify Tess of the new order.
        const adminEmail =
          process.env.ADMIN_NOTIFY_EMAIL ??
          process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
        if (adminEmail) {
          try {
            const order = await db.query.orders.findFirst({
              where: (t, { eq }) => eq(t.id, orderId),
              columns: {
                number: true,
                email: true,
                firstName: true,
                lastName: true,
                fulfillment: true,
                totalCents: true,
              },
            });
            if (order) {
              const customerName =
                [order.firstName, order.lastName].filter(Boolean).join(" ") ||
                "(no name)";
              await sendEmail({
                to: adminEmail,
                subject: `[TES] New order ${order.number}`,
                html: `
                  <p>A new order just came in.</p>
                  <p><strong>Order:</strong> ${order.number}</p>
                  <p><strong>Customer:</strong> ${customerName} &lt;${order.email}&gt;</p>
                  <p><strong>Fulfillment:</strong> ${order.fulfillment}</p>
                  <p><strong>Total:</strong> ${formatCents(order.totalCents)}</p>
                  <p><a href="${process.env.NEXTAUTH_URL ?? ""}/admin/orders/${orderId}">View order in admin →</a></p>
                `,
              });
            }
          } catch (e) {
            console.error("[webhook] order notification email failed", e);
          }
        }
      }
      // Custom-request quotes use a Stripe Payment Link, which still emits
      // checkout.session.completed events. Their metadata.kind = "custom_request".
      const requestId = sessionObj.metadata?.customRequestId;
      if (requestId && sessionObj.payment_status === "paid") {
        await db
          .update(customRequests)
          .set({
            status: "paid",
            paidAt: new Date(),
            stripeCheckoutSessionId: sessionObj.id,
          })
          .where(eq(customRequests.id, requestId));
      }
      break;
    }
    default:
      // Other events ignored — we can light them up as needed.
      break;
  }

  return NextResponse.json({ received: true });
}
