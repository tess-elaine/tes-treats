"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { siteConfig, type DeliveryZone } from "@/db/schema/site_config";
import { eq } from "drizzle-orm";
import { clearCart, getCart } from "@/lib/cart";
import { createPendingOrder, type DeliveryAddress } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

function pickDeliveryFeeCents(
  zones: DeliveryZone[],
  postalCode: string,
): number | null {
  const code = postalCode.trim().slice(0, 5);
  for (const z of zones) {
    if (z.postalCodes.map((p) => p.trim()).includes(code)) return z.feeCents;
  }
  return null;
}

export async function startCheckoutAction(formData: FormData) {
  const session = await auth();
  const cart = await getCart();
  if (cart.lines.length === 0) {
    redirect("/cart");
  }

  const fulfillment = formData.get("fulfillment") === "delivery" ? "delivery" : "pickup";
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName || !lastName) {
    redirect("/checkout?error=name");
  }
  const email =
    String(formData.get("email") ?? "").trim().toLowerCase() ||
    session?.user?.email ||
    "";
  if (!email || !email.includes("@")) {
    redirect("/checkout?error=email");
  }

  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const pickupLocation = fulfillment === "pickup"
    ? String(formData.get("pickupLocation") ?? "").trim() || undefined
    : undefined;
  const rawNotes = String(formData.get("customerNotes") ?? "").trim();
  const customerNotes = [
    pickupLocation ? `Pickup location: ${pickupLocation}` : null,
    rawNotes || null,
  ].filter(Boolean).join("\n") || undefined;

  let deliveryAddress: DeliveryAddress | undefined;
  let deliveryFeeCents = 0;
  if (fulfillment === "delivery") {
    deliveryAddress = {
      line1: String(formData.get("line1") ?? "").trim(),
      line2: String(formData.get("line2") ?? "").trim() || undefined,
      city: String(formData.get("city") ?? "").trim(),
      state: String(formData.get("state") ?? "").trim() || "NY",
      postalCode: String(formData.get("postalCode") ?? "").trim(),
      notes: String(formData.get("addressNotes") ?? "").trim() || undefined,
    };
    if (
      !deliveryAddress.line1 ||
      !deliveryAddress.city ||
      !deliveryAddress.postalCode
    ) {
      redirect("/checkout?error=address");
    }

    deliveryFeeCents = 1000; // flat $10 delivery fee
  }

  const order = await createPendingOrder({
    cart,
    firstName,
    lastName,
    email,
    phone,
    userId: session?.user?.id,
    fulfillment,
    deliveryAddress,
    deliveryFeeCents,
    customerNotes,
  });

  const stripe = getStripe();

  if (!stripe) {
    // Dev / Stripe-disabled path. Treat the order as paid immediately so
    // we can exercise the full confirmation UX without a payment provider.
    await db
      .update(orders)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(orders.id, order.id));
    await clearCart();
    revalidatePath("/", "layout");
    redirect(`/orders/${order.number}/confirmation?dev=1`);
  }

  // Stripe live path. Build the Checkout session from the cart's resolved
  // lines so prices match what the user just confirmed.
  const lineItems = cart.lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: "usd" as const,
      unit_amount: l.unitPriceCents,
      product_data: {
        name: l.name + (l.variantLabel ? ` (${l.variantLabel})` : ""),
      },
    },
  }));
  if (deliveryFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd" as const,
        unit_amount: deliveryFeeCents,
        product_data: { name: "Local delivery" },
      },
    });
  }

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: lineItems,
    metadata: { orderId: order.id, orderNumber: order.number },
    success_url: `${baseUrl}/orders/${order.number}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/cart`,
    payment_intent_data: {
      metadata: { orderId: order.id, orderNumber: order.number },
    },
  });

  await db
    .update(orders)
    .set({ stripeSessionId: checkoutSession.id })
    .where(eq(orders.id, order.id));

  redirect(checkoutSession.url ?? "/cart");
}
