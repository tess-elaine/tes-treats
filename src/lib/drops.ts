/**
 * Drop selection helpers — used by /drops, /drops/[slug], and the homepage.
 *
 * "Active" = published AND now is before closesAt (i.e. still purchasable
 * or about to open). Once closesAt passes, a drop is hidden from public
 * listings; admin can still see it.
 */
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { drops } from "@/db/schema/drops";

export type ActiveDropRow = Awaited<ReturnType<typeof activeDrops>>[number];

export async function activeDrops() {
  const now = new Date();
  return db
    .select()
    .from(drops)
    .where(and(eq(drops.isPublished, true), gt(drops.closesAt, now)))
    .orderBy(asc(drops.opensAt));
}

export async function nextDrop() {
  const list = await activeDrops();
  return list[0] ?? null;
}

export type DropPhase = "preorder" | "open" | "closed";

export function phaseOf(d: { opensAt: Date; closesAt: Date }, now = new Date()): DropPhase {
  if (now < d.opensAt) return "preorder";
  if (now > d.closesAt) return "closed";
  return "open";
}

export function inventoryRemaining(
  total: number | null | undefined,
  sold: number,
): number | null {
  if (total == null) return null; // unlimited
  return Math.max(0, total - sold);
}
