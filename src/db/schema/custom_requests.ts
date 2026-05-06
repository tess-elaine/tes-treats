/**
 * Custom request → quote → payment workflow.
 *
 * Customer submits with photos. Tess reviews, sets a price, and the system
 * sends a Stripe payment link. Once paid, the request transitions to the
 * fulfillment lane just like any other order.
 */
import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const customRequestStatus = pgEnum("custom_request_status", [
  "submitted",
  "reviewing",
  "needs_info",
  "quoted",
  "declined",
  "paid",
  "in_kitchen",
  "fulfilled",
  "cancelled",
]);

export const customRequests = pgTable("custom_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(), // "CR-1042"
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  name: text("name"),
  phone: text("phone"),

  status: customRequestStatus("status").notNull().default("submitted"),

  occasion: text("occasion"), // "Wedding", "Baby Shower", "Just because"
  description: text("description").notNull(),
  desiredDate: date("desired_date"),
  servings: integer("servings"),

  // Set by Tess when she quotes.
  quoteCents: integer("quote_cents"),
  quoteNotes: text("quote_notes"),
  stripePaymentLinkUrl: text("stripe_payment_link_url"),
  stripePaymentLinkId: text("stripe_payment_link_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),

  paidAt: timestamp("paid_at", { withTimezone: true }),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customRequestPhotos = pgTable("custom_request_photo", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => customRequests.id, { onDelete: "cascade" }),
  // Stored as a Spaces (S3) URL.
  url: text("url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
});
