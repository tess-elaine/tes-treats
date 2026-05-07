/**
 * Drop selection helpers — used by /drops, /drops/[slug], and the homepage.
 *
 * "Active" = published AND closesAt is still in the future.
 * "Past"   = published AND closesAt has passed.
 */
import { and, asc, desc, eq, gt, lte } from "drizzle-orm";
import { db } from "@/db";
import { drops } from "@/db/schema/drops";

const withBox = {
  cookieBox: { columns: { tagline: true, description: true, heroImageUrl: true, name: true } },
} as const;

export type ActiveDropRow = Awaited<ReturnType<typeof activeDrops>>[number];
export type PastDropRow = Awaited<ReturnType<typeof pastDrops>>[number];

export async function activeDrops() {
  const now = new Date();
  return db.query.drops.findMany({
    where: and(eq(drops.isPublished, true), gt(drops.closesAt, now)),
    orderBy: [asc(drops.opensAt)],
    with: withBox,
  });
}

export async function pastDrops() {
  const now = new Date();
  return db.query.drops.findMany({
    where: and(eq(drops.isPublished, true), lte(drops.closesAt, now)),
    orderBy: [desc(drops.closesAt)],
    with: withBox,
  });
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
  if (total == null) return null;
  return Math.max(0, total - sold);
}
