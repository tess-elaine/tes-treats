-- Migration 0009: ingredient library + product_ingredient join table + variant unit_count

ALTER TABLE "product_variant" ADD COLUMN IF NOT EXISTS "unit_count" integer;

CREATE TABLE IF NOT EXISTS "ingredient" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL UNIQUE,
  "allergens" text[] NOT NULL DEFAULT '{}',
  "default_unit" text NOT NULL DEFAULT 'cup',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "product_ingredient" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "ingredient_id" uuid NOT NULL REFERENCES "ingredient"("id") ON DELETE RESTRICT,
  "quantity_per_unit" numeric(10, 4) NOT NULL,
  "unit" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0
);
