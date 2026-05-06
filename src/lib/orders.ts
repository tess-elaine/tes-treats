/**
 * Order helpers — number generation, cart-to-order materialization.
 *
 * The order_item table snapshots name + price at create time so historical
 * orders survive product edits/deletes. We resolve the cart (current prices)
 * and serialize each line to an order_item row.
 */
import { randomBytes } from "crypto";
import { db } from "@/db";
import {
  orders,
  orderItems,
  type fulfillmentType,
} from "@/db/schema/orders";
import type { Cart } from "./cart";

export type Fulfillment = (typeof fulfillmentType.enumValues)[number];

export type DeliveryAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  notes?: string;
};

export type CreateOrderInput = {
  cart: Cart;
  email: string;
  phone?: string;
  userId?: string;
  fulfillment: Fulfillment;
  deliveryAddress?: DeliveryAddress;
  fulfillmentDate?: Date;
  customerNotes?: string;
  deliveryFeeCents?: number;
  taxCents?: number;
};

export async function nextOrderNumber(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = `TT-${randomBytes(3).toString("hex").toUpperCase()}`;
    const existing = await db.query.orders.findFirst({
      where: (t, { eq }) => eq(t.number, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("Could not allocate unique order number after 5 attempts");
}

/** Insert a `pending` order + its items, snapshotting prices/labels. */
export async function createPendingOrder(input: CreateOrderInput): Promise<{
  id: string;
  number: string;
  totalCents: number;
}> {
  const number = await nextOrderNumber();
  const subtotal = input.cart.subtotalCents;
  const deliveryFee = input.deliveryFeeCents ?? 0;
  const tax = input.taxCents ?? 0;
  const total = subtotal + deliveryFee + tax;

  const [order] = await db
    .insert(orders)
    .values({
      number,
      userId: input.userId,
      email: input.email,
      phone: input.phone,
      status: "pending",
      fulfillment: input.fulfillment,
      deliveryAddress:
        input.fulfillment === "delivery" && input.deliveryAddress
          ? input.deliveryAddress
          : null,
      fulfillmentDate: input.fulfillmentDate,
      subtotalCents: subtotal,
      deliveryFeeCents: deliveryFee,
      taxCents: tax,
      totalCents: total,
      customerNotes: input.customerNotes,
    })
    .returning({ id: orders.id, number: orders.number, totalCents: orders.totalCents });

  for (const line of input.cart.lines) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productVariantId: line.kind === "variant" ? line.productVariantId : null,
      dropId: line.kind === "drop_box" ? line.dropId : null,
      dropItemId: line.kind === "drop_dozen" ? line.dropItemId : null,
      nameSnapshot: line.name,
      variantLabelSnapshot: line.variantLabel,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
    });
  }

  return order;
}
