/**
 * Holiday drops.
 *
 *   holiday → represents a single holiday occasion (e.g. "Easter 2026").
 *             Pre-populated each year from a US-holiday seed; Tess can remove,
 *             rename, or add custom ones in admin.
 *   drop    → the product offering tied to a holiday (3-5 cookies in a box).
 *             Has open/close times (when ordering is live) and a fulfillment
 *             window (when Tess will bake & hand off).
 *   dropItem → one cookie in the box. Sold à la carte by the dozen, OR
 *             included in the assorted box.
 *   dropSubscriber → "notify me" email list for upcoming drops.
 */
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uuid,
} from "drizzle-orm/pg-core";
import { products } from "./catalog";

export const holidays = pgTable("holiday", {
  id: uuid("id").primaryKey().defaultRandom(),
  // e.g. "Easter", "Mother's Day"
  name: text("name").notNull(),
  // The actual calendar date this instance falls on.
  date: date("date").notNull(),
  // If true, seed regenerates this for the next year automatically.
  isRecurring: boolean("is_recurring").notNull().default(true),
  // Tess can hide a pre-populated holiday without deleting it (audit trail).
  isHidden: boolean("is_hidden").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const drops = pgTable("drop", {
  id: uuid("id").primaryKey().defaultRandom(),
  holidayId: uuid("holiday_id").references(() => holidays.id, {
    onDelete: "set null",
  }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(), // "Easter Garden Box"
  tagline: text("tagline"),
  description: text("description"),
  heroImageUrl: text("hero_image_url"),

  // Ordering window.
  opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),

  // When Tess will hand off (delivery / pickup window).
  fulfillmentStart: date("fulfillment_start").notNull(),
  fulfillmentEnd: date("fulfillment_end").notNull(),

  // Assorted-box pricing & inventory. NULL allowed if the drop only sells
  // by-the-dozen variants (rare, but supported).
  assortedBoxPriceCents: integer("assorted_box_price_cents"),
  assortedBoxInventory: integer("assorted_box_inventory"),
  assortedBoxSold: integer("assorted_box_sold").notNull().default(0),

  isPublished: boolean("is_published").notNull().default(false),
  /** Set once a "drop is open" announcement email has gone out, to prevent
   *  duplicate sends if Tess clicks the button twice. Reset to NULL to allow
   *  re-sending. */
  announcementSentAt: timestamp("announcement_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dropItems = pgTable("drop_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  dropId: uuid("drop_id")
    .notNull()
    .references(() => drops.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  // Order within the box.
  sortOrder: integer("sort_order").notNull().default(0),
  // Per-dozen price for buying just THIS cookie from the drop.
  dozenPriceCents: integer("dozen_price_cents").notNull(),
  // Inventory in dozens for à la carte purchase.
  dozenInventory: integer("dozen_inventory"),
  dozenSold: integer("dozen_sold").notNull().default(0),
});

export const dropSubscribers = pgTable("drop_subscriber", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  source: text("source"), // "homepage", "drop-page", "checkout"
});
