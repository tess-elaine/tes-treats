-- Migration 0006: Replace holiday system with cookie box system.
--
-- Destructive in dev (truncates drop + drop_item so we start clean).
-- No production data exists yet.

--> statement-breakpoint
TRUNCATE "drop_item", "drop" CASCADE;

--> statement-breakpoint
CREATE TABLE "cookie_box" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "tagline" text,
  "hero_image_url" text,
  "notes" text,
  "is_hidden" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE "cookie_box_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cookie_box_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  CONSTRAINT "cookie_box_item_cookie_box_id_cookie_box_id_fk"
    FOREIGN KEY ("cookie_box_id") REFERENCES "cookie_box"("id") ON DELETE CASCADE,
  CONSTRAINT "cookie_box_item_product_id_product_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT
);

--> statement-breakpoint
-- Add cookie_box_id to drop; remove holiday-era columns.
ALTER TABLE "drop"
  ADD COLUMN "cookie_box_id" uuid
    REFERENCES "cookie_box"("id") ON DELETE SET NULL;

ALTER TABLE "drop"
  DROP COLUMN IF EXISTS "holiday_id",
  DROP COLUMN IF EXISTS "tagline",
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "hero_image_url";

--> statement-breakpoint
-- Rework drop_item: swap product_id for cookie_box_item_id.
ALTER TABLE "drop_item"
  DROP COLUMN IF EXISTS "product_id",
  DROP COLUMN IF EXISTS "sort_order";

ALTER TABLE "drop_item"
  ADD COLUMN "cookie_box_item_id" uuid NOT NULL
    REFERENCES "cookie_box_item"("id") ON DELETE RESTRICT,
  ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0,
  ALTER COLUMN "dozen_price_cents" SET DEFAULT 0;

--> statement-breakpoint
DROP TABLE IF EXISTS "holiday";
