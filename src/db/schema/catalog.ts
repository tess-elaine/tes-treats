/**
 * Catalog: categories + products + variants + images.
 *
 *   - product_category: e.g. Cookies, Pies, Bars. Editable in admin.
 *   - product:          a recipe Tess sells.
 *   - product_variant:  the SKU (Half Dozen, Dozen, 9-inch).
 *   - product_image:    one or more images per product. Exactly one carries
 *                       isPrimary=true and is used for thumbnails. The rest
 *                       form the gallery on /shop/[slug].
 *
 * The single-image-url column has been retired in favor of product_image —
 * see drizzle/0004_categories_and_images.sql for the data migration.
 */
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";

export const productCategories = pgTable("product_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("product", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  description: text("description"),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => productCategories.id, { onDelete: "restrict" }),
  // Whether the product appears on /shop. Drop-only cookies stay false.
  isAvailable: boolean("is_available").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  // Free-form callouts: ["Gluten-Free", "Contains Nuts", "Vegan"]
  ingredientChips: text("ingredient_chips").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImages = pgTable("product_image", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
  // App code enforces "exactly one primary per product" — there's no DB
  // constraint because partial unique indexes get hairy with Drizzle.
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable("product_variant", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  // e.g. "Dozen", "Half Dozen", "9-inch", "Single"
  label: text("label").notNull(),
  // Cents. We never store dollars in floats.
  priceCents: integer("price_cents").notNull(),
  // Optional override for displayed sub-label / weight.
  weightOz: integer("weight_oz"),
  // How many individual items (cookies, muffins) are in this variant.
  // Used for ingredient quantity math: total = quantity × unitCount × amountPerUnit.
  unitCount: integer("unit_count"),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Ingredient library
// ---------------------------------------------------------------------------

// Big-9 allergen keys (FDA standard). Stored as a subset on each ingredient.
// Display labels live in the application layer (ALLERGEN_LABELS in lib/allergens.ts).
export const ingredients = pgTable("ingredient", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  allergens: text("allergens").array().notNull().default([]),
  defaultUnit: text("default_unit").notNull().default("cup"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Per-product ingredient assignments. quantityPerUnit is the amount of this
// ingredient needed for one individual item (one cookie, one muffin, etc.).
export const productIngredients = pgTable("product_ingredient", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "restrict" }),
  quantityPerUnit: numeric("quantity_per_unit", { precision: 10, scale: 4 }).notNull(),
  unit: text("unit").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const productsRelations = relations(products, ({ many }) => ({
  productIngredients: many(productIngredients),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  productIngredients: many(productIngredients),
}));

export const productIngredientsRelations = relations(productIngredients, ({ one }) => ({
  product: one(products, {
    fields: [productIngredients.productId],
    references: [products.id],
  }),
  ingredient: one(ingredients, {
    fields: [productIngredients.ingredientId],
    references: [ingredients.id],
  }),
}));
