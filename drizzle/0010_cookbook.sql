-- Migration 0010: Cookbook / recipe system
-- Adds purchase cost fields to ingredient, and two new tables:
--   product_recipe  — named batch recipes per product
--   recipe_ingredient — ingredients at batch quantities

ALTER TABLE "ingredient" ADD COLUMN IF NOT EXISTS "purchase_cost_cents" integer;
ALTER TABLE "ingredient" ADD COLUMN IF NOT EXISTS "purchase_quantity" numeric(10, 4);
ALTER TABLE "ingredient" ADD COLUMN IF NOT EXISTS "purchase_unit" text;

CREATE TABLE IF NOT EXISTS "product_recipe" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "name" text NOT NULL DEFAULT 'Standard Batch',
  "batch_yield" integer NOT NULL,
  "bake_temp" integer,
  "bake_time_min" integer,
  "bake_time_max" integer,
  "scoop_size" text,
  "cookies_per_pan" integer,
  "directions" text,
  "notes" text,
  "is_default" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "recipe_ingredient" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipe_id" uuid NOT NULL REFERENCES "product_recipe"("id") ON DELETE CASCADE,
  "ingredient_id" uuid NOT NULL REFERENCES "ingredient"("id") ON DELETE RESTRICT,
  "batch_quantity" numeric(10, 4) NOT NULL,
  "unit" text NOT NULL,
  "batch_quantity_grams" numeric(10, 4),
  "notes" text,
  "sort_order" integer NOT NULL DEFAULT 0
);
