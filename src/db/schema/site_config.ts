/**
 * Site configuration — singleton row (id = 1). Everything operationally
 * tunable lives here so Tess never has to redeploy.
 *
 * In particular: the bakery address is here because Tess is moving in a
 * few months — never hardcode it in components.
 */
import {
  pgTable,
  integer,
  boolean,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export type BakeryAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
};

export type DeliveryZone = {
  // Display label in admin and on customer side.
  label: string;
  // Either a list of postal codes OR a max-distance-miles match. We start with
  // postal codes (simpler) — distance can be added later by storing centroid lat/lng.
  postalCodes: string[];
  feeCents: number;
  minSubtotalCents?: number;
};

export const siteConfig = pgTable("site_config", {
  // Singleton: always row id = 1.
  id: integer("id").primaryKey().default(1),

  bakeryAddress: jsonb("bakery_address").$type<BakeryAddress>().notNull(),

  // Pickup is always on for v1.
  pickupEnabled: boolean("pickup_enabled").notNull().default(true),
  pickupInstructions: text("pickup_instructions"),

  // Local delivery (Tess hand-delivers for v1).
  deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
  deliveryZones: jsonb("delivery_zones").$type<DeliveryZone[]>().notNull().default([]),
  deliveryNotes: text("delivery_notes"),

  // Tax — disabled for v1 (NY exempts most baked goods sold whole/cold).
  // Toggle on once we cross threshold; warning surfaces in admin when annual
  // revenue gets within 80% of taxThresholdCents.
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxThresholdCents: integer("tax_threshold_cents").notNull().default(2_000_000), // $20k

  // Future: shipping. Off for v1.
  shippingEnabled: boolean("shipping_enabled").notNull().default(false),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
