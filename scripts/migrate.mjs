import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);

// Belt-and-suspenders: add columns directly in case migration tracker is out of sync.
await client`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "first_name" text`;
await client`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "last_name" text`;

// Migration 0009: ingredient library + variant unit_count
await client`ALTER TABLE "product_variant" ADD COLUMN IF NOT EXISTS "unit_count" integer`;
await client`
  CREATE TABLE IF NOT EXISTS "ingredient" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL UNIQUE,
    "allergens" text[] NOT NULL DEFAULT '{}',
    "default_unit" text NOT NULL DEFAULT 'cup',
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
  )
`;
await client`
  CREATE TABLE IF NOT EXISTS "product_ingredient" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "product_id" uuid NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
    "ingredient_id" uuid NOT NULL REFERENCES "ingredient"("id") ON DELETE RESTRICT,
    "quantity_per_unit" numeric(10, 4) NOT NULL,
    "unit" text NOT NULL,
    "sort_order" integer NOT NULL DEFAULT 0
  )
`;

console.log("Applying migrations...");
await migrate(db, { migrationsFolder: "./drizzle" });
await client.end();
console.log("Migrations done.");
