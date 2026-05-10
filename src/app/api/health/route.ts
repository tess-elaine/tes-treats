import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Railway health check. Returns 200 only when the DB is reachable AND the
// current schema matches what the app expects. If a migration didn't apply,
// these queries will throw and Railway will hold the old deployment live.
export async function GET() {
  try {
    await db.execute(sql`SELECT "unit_count" FROM "product_variant" LIMIT 0`);
    await db.execute(sql`SELECT 1 FROM "ingredient" LIMIT 0`);
    await db.execute(sql`SELECT 1 FROM "product_ingredient" LIMIT 0`);
    await db.execute(sql`SELECT 1 FROM "product_recipe" LIMIT 0`);
    await db.execute(sql`SELECT 1 FROM "recipe_ingredient" LIMIT 0`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[health] schema check failed:", err);
    return Response.json(
      { ok: false, error: String((err as Error).message ?? err) },
      { status: 503 }
    );
  }
}
