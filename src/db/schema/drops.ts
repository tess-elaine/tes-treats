/**
 * Cookie box drops.
 *
 *   cookieBox     → a curated set of 3-4 cookies, themed to a time of year.
 *                   Reusable across multiple drops (e.g. "Mother's Day Box"
 *                   can run in 2025 and 2026).
 *   cookieBoxItem → one cookie inside the box. Defines composition + display order.
 *   drop          → a timed sale of a cookie box. Has open/close windows,
 *                   fulfillment dates, pricing, and inventory.
 *   dropItem      → per-drop à la carte pricing for each cookie in the box
 *                   (dozen price, inventory, sold count).
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
import { relations } from "drizzle-orm";
import { products } from "./catalog";

// ---------------------------------------------------------------------------
// Cookie boxes — the reusable curated product
// ---------------------------------------------------------------------------
export const cookieBoxes = pgTable("cookie_box", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  tagline: text("tagline"),
  heroImageUrl: text("hero_image_url"),
  notes: text("notes"),
  isHidden: boolean("is_hidden").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// The 3-4 cookies inside a box — defines composition and display order.
export const cookieBoxItems = pgTable("cookie_box_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  cookieBoxId: uuid("cookie_box_id")
    .notNull()
    .references(() => cookieBoxes.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Drops — a timed sale event for a cookie box
// ---------------------------------------------------------------------------
export const drops = pgTable("drop", {
  id: uuid("id").primaryKey().defaultRandom(),
  cookieBoxId: uuid("cookie_box_id").references(() => cookieBoxes.id, {
    onDelete: "set null",
  }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),

  // Ordering window.
  opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),

  // When Tess will hand off (delivery / pickup window).
  fulfillmentStart: date("fulfillment_start").notNull(),
  fulfillmentEnd: date("fulfillment_end").notNull(),

  // Assorted-box pricing & inventory.
  assortedBoxPriceCents: integer("assorted_box_price_cents"),
  assortedBoxInventory: integer("assorted_box_inventory"),
  assortedBoxSold: integer("assorted_box_sold").notNull().default(0),

  isPublished: boolean("is_published").notNull().default(false),
  /** Set once an announcement email has gone out; reset to NULL to re-send. */
  announcementSentAt: timestamp("announcement_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Per-drop à la carte pricing for each cookie in the box.
// Populated automatically when a drop is created from a box.
export const dropItems = pgTable("drop_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  dropId: uuid("drop_id")
    .notNull()
    .references(() => drops.id, { onDelete: "cascade" }),
  cookieBoxItemId: uuid("cookie_box_item_id")
    .notNull()
    .references(() => cookieBoxItems.id, { onDelete: "restrict" }),
  sortOrder: integer("sort_order").notNull().default(0),
  dozenPriceCents: integer("dozen_price_cents").notNull().default(0),
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
  source: text("source"),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const cookieBoxRelations = relations(cookieBoxes, ({ many }) => ({
  items: many(cookieBoxItems),
  drops: many(drops),
}));

export const cookieBoxItemRelations = relations(cookieBoxItems, ({ one, many }) => ({
  cookieBox: one(cookieBoxes, {
    fields: [cookieBoxItems.cookieBoxId],
    references: [cookieBoxes.id],
  }),
  product: one(products, {
    fields: [cookieBoxItems.productId],
    references: [products.id],
  }),
  dropItems: many(dropItems),
}));

export const dropsRelations = relations(drops, ({ one, many }) => ({
  cookieBox: one(cookieBoxes, {
    fields: [drops.cookieBoxId],
    references: [cookieBoxes.id],
  }),
  items: many(dropItems),
}));

export const dropItemsRelations = relations(dropItems, ({ one }) => ({
  drop: one(drops, { fields: [dropItems.dropId], references: [drops.id] }),
  cookieBoxItem: one(cookieBoxItems, {
    fields: [dropItems.cookieBoxItemId],
    references: [cookieBoxItems.id],
  }),
}));

// Allows db.query.products to resolve cookieBoxItems relation.
export const productCookieBoxItemRelations = relations(products, ({ many }) => ({
  cookieBoxItems: many(cookieBoxItems),
}));
