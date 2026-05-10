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

console.log("Applying migrations...");
await migrate(db, { migrationsFolder: "./drizzle" });
await client.end();
console.log("Migrations done.");
