/**
 * Orders for catalog purchases AND drop purchases. Custom-request payments
 * use Stripe payment links, not our checkout, so they live in custom_requests.
 *
 * `orderItem` is polymorphic: an item is either a (productVariantId) row or
 * an (assorted box from dropId) row or a (dozen of a dropItemId) row. We
 * enforce "exactly one of these is set" at the application layer.
 */
import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { productVariants } from "./catalog";
import { drops, dropItems } from "./drops";

export const orderStatus = pgEnum("order_status", [
  "pending", // Stripe session created, payment not yet confirmed
  "paid",
  "in_kitchen", // Tess is baking
  "ready", // ready for pickup / out for delivery
  "fulfilled",
  "cancelled",
  "refunded",
]);

export const fulfillmentType = pgEnum("fulfillment_type", [
  "pickup",
  "delivery",
]);

export const orders = pgTable("order", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Human-friendly number for Tess; generated on insert (e.g. "TT-1042").
  number: text("number").notNull().unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  // Guest-checkout email if not signed in.
  email: text("email").notNull(),
  phone: text("phone"),

  status: orderStatus("status").notNull().default("pending"),
  fulfillment: fulfillmentType("fulfillment").notNull(),
  // For delivery orders. Stored as JSON so we can capture full address shape.
  deliveryAddress: jsonb("delivery_address").$type<{
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    notes?: string;
  } | null>(),
  // ISO date for desired pickup/delivery day.
  fulfillmentDate: timestamp("fulfillment_date", { withTimezone: true }),

  subtotalCents: integer("subtotal_cents").notNull(),
  deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
  taxCents: integer("tax_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),

  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  customerNotes: text("customer_notes"),
  adminNotes: text("admin_notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
});

export const orderItems = pgTable("order_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),

  // Exactly one of these three references should be set per row.
  // ON DELETE SET NULL — order line items keep their snapshot fields
  // (nameSnapshot, priceCents, etc.) so historical orders survive when
  // the underlying product / variant / drop is later removed.
  productVariantId: uuid("product_variant_id").references(
    () => productVariants.id,
    { onDelete: "set null" },
  ),
  // Whole assorted box from a drop.
  dropId: uuid("drop_id").references(() => drops.id, { onDelete: "set null" }),
  // Dozen of one specific cookie within a drop.
  dropItemId: uuid("drop_item_id").references(() => dropItems.id, {
    onDelete: "set null",
  }),

  // Snapshot fields so historical orders aren't broken by later edits.
  nameSnapshot: text("name_snapshot").notNull(),
  variantLabelSnapshot: text("variant_label_snapshot"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull().default(1),
});
