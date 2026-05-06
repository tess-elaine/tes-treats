import Link from "next/link";
import { notFound } from "next/navigation";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { formatCents, formatDate } from "@/lib/format";
import {
  setOrderStatusAction,
  refundOrderAction,
  updateAdminNotesAction,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending payment",
  paid: "Paid",
  in_kitchen: "In kitchen",
  ready: "Ready",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const TRANSITIONS: Record<string, { label: string; status: string }[]> = {
  pending: [
    { label: "Mark paid", status: "paid" },
    { label: "Cancel", status: "cancelled" },
  ],
  paid: [
    { label: "Start baking", status: "in_kitchen" },
    { label: "Cancel", status: "cancelled" },
  ],
  in_kitchen: [
    { label: "Mark ready", status: "ready" },
    { label: "Cancel", status: "cancelled" },
  ],
  ready: [
    { label: "Mark fulfilled", status: "fulfilled" },
    { label: "Cancel", status: "cancelled" },
  ],
  fulfilled: [],
  cancelled: [],
  refunded: [],
};

export default async function AdminOrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const order = await db.query.orders.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!order) notFound();

  const items = await db.query.orderItems.findMany({
    where: (t, { eq }) => eq(t.orderId, order.id),
  });

  const transitions = TRANSITIONS[order.status] ?? [];
  const canRefund = ["paid", "in_kitchen", "ready", "fulfilled"].includes(order.status);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/orders"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All orders
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Order
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
            {order.number}
          </h1>
          <p className="mt-1 text-on-surface-variant">
            {formatDate(order.createdAt, { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
        <div className="text-right">
          <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
            Status
          </p>
          <p className="mt-1 font-headline text-xl font-bold text-primary">
            {STATUS_LABEL[order.status] ?? order.status}
          </p>
        </div>
      </header>

      {error === "refund" ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          Stripe refund failed. Check the Stripe dashboard.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <NibbleCard bite="none" className="p-6">
            <h2 className="font-headline text-xl font-bold text-primary">Customer</h2>
            <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
              <Row label="Email" value={<a href={`mailto:${order.email}`} className="text-primary underline">{order.email}</a>} />
              <Row label="Phone" value={order.phone ?? "—"} />
              <Row label="Fulfillment" value={<span className="capitalize">{order.fulfillment}</span>} />
              <Row label="When" value={order.fulfillmentDate ? formatDate(order.fulfillmentDate) : "Not set"} />
              {order.fulfillment === "delivery" && order.deliveryAddress ? (
                <>
                  <Row
                    label="Address"
                    value={
                      <div>
                        <p>{order.deliveryAddress.line1}</p>
                        {order.deliveryAddress.line2 ? <p>{order.deliveryAddress.line2}</p> : null}
                        <p>
                          {order.deliveryAddress.city}, {order.deliveryAddress.state}{" "}
                          {order.deliveryAddress.postalCode}
                        </p>
                        {order.deliveryAddress.notes ? (
                          <p className="text-on-surface-variant text-xs">{order.deliveryAddress.notes}</p>
                        ) : null}
                      </div>
                    }
                  />
                </>
              ) : null}
              {order.customerNotes ? (
                <Row label="Notes" value={<p className="whitespace-pre-wrap">{order.customerNotes}</p>} />
              ) : null}
            </dl>
          </NibbleCard>

          <NibbleCard bite="none" className="p-6">
            <h2 className="font-headline text-xl font-bold text-primary">Line items</h2>
            <ul className="mt-4 space-y-3">
              {items.map((it) => (
                <li key={it.id} className="flex items-baseline justify-between border-b border-outline-variant/15 pb-2 last:border-0 last:pb-0">
                  <div className="pr-4">
                    <p className="font-medium text-on-surface">
                      {it.nameSnapshot}
                      {it.variantLabelSnapshot ? ` · ${it.variantLabelSnapshot}` : ""}
                    </p>
                    <p className="text-xs text-on-surface-variant">× {it.quantity}</p>
                  </div>
                  <p className="font-headline font-bold text-on-surface">
                    {formatCents(it.unitPriceCents * it.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-outline-variant/15 pt-4 text-sm">
              <Pair label="Subtotal" value={formatCents(order.subtotalCents)} />
              {order.deliveryFeeCents > 0 ? (
                <Pair label="Delivery" value={formatCents(order.deliveryFeeCents)} />
              ) : null}
              {order.taxCents > 0 ? (
                <Pair label="Tax" value={formatCents(order.taxCents)} />
              ) : null}
              <Pair label="Total" value={formatCents(order.totalCents)} emphasized />
            </dl>
          </NibbleCard>

          <NibbleCard bite="none" className="p-6">
            <h2 className="font-headline text-xl font-bold text-primary">Internal notes</h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Visible to admin only. Never shown to the customer.
            </p>
            <form action={updateAdminNotesAction} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <textarea
                name="adminNotes"
                rows={3}
                defaultValue={order.adminNotes ?? ""}
                className="ghost-border w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
              <button
                type="submit"
                className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
              >
                Save notes
              </button>
            </form>
          </NibbleCard>
        </div>

        <div className="space-y-6">
          <NibbleCard bite="none" className="p-6">
            <h2 className="font-headline text-xl font-bold text-primary">Move it forward</h2>
            {transitions.length === 0 ? (
              <p className="mt-3 text-sm text-on-surface-variant">
                This order is in a terminal state. No further transitions available.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {transitions.map((t) => (
                  <form key={t.status} action={setOrderStatusAction}>
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="status" value={t.status} />
                    <BiteButton size="md" variant={t.status === "cancelled" ? "secondary" : "primary"} className="w-full">
                      {t.label}
                    </BiteButton>
                  </form>
                ))}
              </div>
            )}
          </NibbleCard>

          {canRefund ? (
            <NibbleCard bite="none" className="p-6">
              <h2 className="font-headline text-xl font-bold text-primary">Refund</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Issues a full refund through Stripe and emails the customer.
              </p>
              <form action={refundOrderAction} className="mt-3">
                <input type="hidden" name="id" value={order.id} />
                <button
                  type="submit"
                  className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
                >
                  Refund this order
                </button>
              </form>
            </NibbleCard>
          ) : null}

          <NibbleCard bite="none" className="p-6">
            <h2 className="font-headline text-xl font-bold text-primary">Stripe</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Session" value={order.stripeSessionId ?? "—"} mono />
              <Row label="Intent" value={order.stripePaymentIntentId ?? "—"} mono />
              <Row label="Paid" value={order.paidAt ? formatDate(order.paidAt, { dateStyle: "medium", timeStyle: "short" }) : "—"} />
              <Row label="Fulfilled" value={order.fulfilledAt ? formatDate(order.fulfilledAt, { dateStyle: "medium", timeStyle: "short" }) : "—"} />
            </dl>
          </NibbleCard>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all text-on-surface" : "text-on-surface"}>{value}</dd>
    </>
  );
}

function Pair({
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
      <dt className={emphasized ? "font-headline font-bold text-primary" : "text-tertiary"}>{label}</dt>
      <dd className={emphasized ? "font-headline font-bold text-primary" : "font-headline font-bold text-on-surface"}>
        {value}
      </dd>
    </div>
  );
}
