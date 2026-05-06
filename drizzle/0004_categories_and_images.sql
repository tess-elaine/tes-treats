-- =============================================================================
-- 0004 — Replace `kind` enum with product_category table; replace single
-- product.image_url with product_image table (one isPrimary, gallery rest).
--
-- Hand-written because drizzle-kit needs interactive TTY to decide between
-- "drop+add column" vs "rename column" when the schema diff is ambiguous.
-- This migration also has data backfill steps that drizzle-kit can't generate.
-- =============================================================================

-- 1. New table: product_category --------------------------------------------
CREATE TABLE "product_category" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug"        text NOT NULL,
  "name"        text NOT NULL,
  "description" text,
  "sort_order"  integer NOT NULL DEFAULT 0,
  "is_active"   boolean NOT NULL DEFAULT true,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- 2. Seed categories from the retiring product_kind enum --------------------
INSERT INTO "product_category" (slug, name, sort_order) VALUES
  ('cookie', 'Cookies',  10),
  ('pie',    'Pies',     20),
  ('bar',    'Bars',     30),
  ('loaf',   'Loaves',   40),
  ('other',  'Other',    99);
--> statement-breakpoint

-- 3. Add product.category_id (nullable for backfill) ------------------------
ALTER TABLE "product" ADD COLUMN "category_id" uuid REFERENCES "product_category"("id") ON DELETE RESTRICT;
--> statement-breakpoint

-- 4. Backfill category_id from existing kind enum ---------------------------
UPDATE "product" p
SET    category_id = c.id
FROM   "product_category" c
WHERE  c.slug = p.kind::text;
--> statement-breakpoint

-- 5. Lock category_id NOT NULL ----------------------------------------------
ALTER TABLE "product" ALTER COLUMN "category_id" SET NOT NULL;
--> statement-breakpoint

-- 6. New table: product_image -----------------------------------------------
CREATE TABLE "product_image" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "url"        text NOT NULL,
  "alt"        text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- 7. Backfill product_image from product.image_url --------------------------
INSERT INTO "product_image" (product_id, url, sort_order, is_primary)
SELECT id, image_url, 0, true
FROM   "product"
WHERE  image_url IS NOT NULL AND image_url <> '';
--> statement-breakpoint

-- 8. Drop the obsolete column + enum ----------------------------------------
ALTER TABLE "product" DROP COLUMN "image_url";
--> statement-breakpoint
ALTER TABLE "product" DROP COLUMN "kind";
--> statement-breakpoint
DROP TYPE "product_kind";
