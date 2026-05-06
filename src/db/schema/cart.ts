/**
 * Cart — DB-backed for signed-in users. Guests use a cookie (lib/cart.ts).
 *
 * One cart row per user (unique on user_id). Lines are polymorphic, same
 * shape as `order_item`: exactly one of (productVariantId, dropId, dropItemId)
 * per row. We dedupe on insert in app code rather than a partial unique index,
 * since Drizzle's PG dialect doesn't model partial uniques nicely.
 */
import {
  pgTable,
  text,
  integer,
  uuid,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { productVariants } from "./catalog";
import { drops, dropItems } from "./drops";

export const carts = pgTable(
  "cart",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cart_user_id_unique").on(t.userId)],
);

export const cartItems = pgTable("cart_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  productVariantId: uuid("product_variant_id").references(
    () => productVariants.id,
    { onDelete: "cascade" },
  ),
  dropId: uuid("drop_id").references(() => drops.id, { onDelete: "cascade" }),
  dropItemId: uuid("drop_item_id").references(() => dropItems.id, {
    onDelete: "cascade",
  }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
