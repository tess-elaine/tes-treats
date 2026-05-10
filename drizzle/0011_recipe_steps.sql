-- Migration 0011: gramsPerCup on ingredient + recipe_step table

ALTER TABLE "ingredient" ADD COLUMN IF NOT EXISTS "grams_per_cup" numeric(10, 4);

CREATE TABLE IF NOT EXISTS "recipe_step" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipe_id" uuid NOT NULL REFERENCES "product_recipe"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0
);
