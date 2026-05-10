import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema/orders";
import { formatCents } from "@/lib/format";
import { getStripe } from "@/lib/stripe";
import { clearCart } from "@/lib/cart";
import { auth } from "@/auth";

export const metadata = { title: "Order confirmed" };
export const dynamic = "force-dynamic";

type Search = { session_id?: string; dev?: string };

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<Search>;
}) {
  const { number } = await params;
  const { session_id } = await searchParams;

  const order = await db.query.orders.findFirst({
    where: (t, { eq }) => eq(t.number, number),
  });
  if (!order) notFound();

  // If a Stripe session id came in and the order is still pending, ask
  // Stripe whether it's actually paid and update accordingly. Webhook is
  // the authoritative path; this is a fast-path so the customer doesn't
  // see "pending" while the webhook lands.
  const stripe = getStripe();
  if (stripe && session_id && order.status === "pending") {
    try {
      const s = await stripe.checkout.sessions.retrieve(session_id);
      if (s.payment_status === "paid") {
        await db
          .update(orders)
          .set({
            status: "paid",
            paidAt: new Date(),
            stripePaymentIntentId:
              typeof s.payment_intent === "string" ? s.payment_intent : null,
          })
          .where(eq(orders.id, order.id));
        order.status = "paid";
      }
    } catch (e) {
      console.error("[stripe] retrieve failed", e);
    }
  }

  // Defensive: if the cart still has items, clear it now (covers the case
  // where the dev path failed to clear or where the webhook hasn't yet).
  const session = await auth();
  if (session?.user?.id && order.userId === session.user.id) {
    await clearCart();
  }

  const items = await db.query.orderItems.findMany({
    where: (t, { eq }) => eq(t.orderId, order.id),
  });

  if (order.status === "pending") {
    return (
      <section className="px-6 py-section">
        <div className="mx-auto max-w-3xl">
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Payment not received
          </p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
            Order {order.number}
          </h1>
          <p className="mt-3 text-tertiary">
            We haven&rsquo;t received payment for this order yet. If you meant to
            complete checkout, please return to the shop and try again.
          </p>
          <div className="mt-10">
            <BiteButton href="/shop" size="lg">Shop the treats</BiteButton>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-3xl">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Thank you
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
          Order {order.number} confirmed.
        </h1>
        <p className="mt-3 text-tertiary">
          We&rsquo;ve sent a copy of this confirmation to{" "}
          <span className="font-medium text-on-surface">{order.email}</span>. Tess will
          reach out about{" "}
          {order.fulfillment === "pickup" ? "pickup timing" : "delivery"}.
        </p>

        <NibbleCard className="mt-10 p-6 md:p-8">
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <div className="pr-2">
                  <p className="font-medium text-on-surface">
                    {it.nameSnapshot}
                    {it.variantLabelSnapshot ? ` · ${it.variantLabelSnapshot}` : ""}
                  </p>
                  <p className="text-sm text-on-surface-variant">× {it.quantity}</p>
                </div>
                <p className="font-headline font-bold text-on-surface">
                  {formatCents(it.unitPriceCents * it.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-outline-variant/15 pt-4">
            <Row label="Subtotal" value={formatCents(order.subtotalCents)} />
            {order.deliveryFeeCents > 0 ? (
              <Row label="Delivery" value={formatCents(order.deliveryFeeCents)} />
            ) : null}
            {order.taxCents > 0 ? (
              <Row label="Tax" value={formatCents(order.taxCents)} />
            ) : null}
            <Row
              label="Total"
              value={formatCents(order.totalCents)}
              emphasized
            />
          </dl>
        </NibbleCard>

        <div className="mt-10 flex flex-wrap gap-3">
          <BiteButton href="/shop" size="lg">Shop more treats</BiteButton>
          <BiteButton href="/account/orders" variant="secondary" size="lg">
            View my orders
          </BiteButton>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className={emphasized ? "font-headline text-lg font-bold text-primary" : "text-tertiary"}>
        {label}
      </dt>
      <dd className={emphasized ? "font-headline text-lg font-bold text-primary" : "font-headline font-bold text-on-surface"}>
        {value}
      </dd>
    </div>
  );
}
