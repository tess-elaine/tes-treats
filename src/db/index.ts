import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

declare global {
  // Reuse the same connection across Next dev hot reloads.

  var __pg: ReturnType<typeof postgres> | undefined;
}

// During `next build`, Next evaluates route modules to collect page data —
// before runtime env vars exist. postgres-js is lazy (no socket opens until
// first query), so a placeholder URL lets the build complete; at runtime we
// require a real DATABASE_URL.
const url =
  process.env.DATABASE_URL ??
  (process.env.NEXT_PHASE === "phase-production-build"
    ? "postgres://build:build@localhost:5432/build"
    : undefined);

if (!url) throw new Error("DATABASE_URL is not set");

const client =
  global.__pg ??
  postgres(url, {
    max: 10,
    idle_timeout: 20,
    prepare: false, // Drizzle handles prepared statements; postgres-js prepare conflicts with some hosted PG.
  });

if (process.env.NODE_ENV !== "production") global.__pg = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
export { schema };
