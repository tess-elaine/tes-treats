/**
 * Cart — single API, two storage backends.
 *
 *   - Signed-in users: rows in `cart` + `cart_item` (one cart per user).
 *   - Guests: an HTTP-only `tt_cart` cookie holding a tiny JSON of line keys
 *     + quantities. We never store prices or names in the cookie — those are
 *     always re-resolved server-side from the catalog/drops at render time,
 *     so a manipulated cookie can change *what* but never *for how much*.
 *
 * Merge-on-sign-in is automatic: every call to `getCart()` checks whether a
 * cookie cart exists alongside a session, and if so, folds the cookie into
 * the user's DB cart and clears the cookie. No client coordination needed.
 *
 * Limits: 50 lines per cart, 99 quantity per line. Defends a manipulated
 * cookie from blowing up DB inserts on sign-in.
 */
import { cookies } from "next/headers";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  carts,
  cartItems,
  productVariants,
  products,
  productImages,
  drops,
  dropItems,
  cookieBoxItems,
} from "@/db/schema";

export type LineKey =
  | { kind: "variant"; productVariantId: string }
  | { kind: "drop_box"; dropId: string }
  | { kind: "drop_dozen"; dropItemId: string };

export type RawLine = LineKey & { quantity: number };

export type ResolvedLine = LineKey & {
  quantity: number;
  name: string;
  variantLabel?: string;
  unitPriceCents: number;
  imageUrl?: string | null;
  /** Stable string id for forms (uses kind+id; same line in cookie or DB). */
  lineId: string;
};

export type Cart = {
  lines: ResolvedLine[];
  subtotalCents: number;
  itemCount: number;
};

const COOKIE_NAME = "tt_cart";
const MAX_LINES = 50;
const MAX_QTY = 99;

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

async function readCookieLines(): Promise<RawLine[]> {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RawLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidLine).slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

async function writeCookieLines(lines: RawLine[]) {
  const c = await cookies();
  if (lines.length === 0) {
    c.delete(COOKIE_NAME);
    return;
  }
  c.set(COOKIE_NAME, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

function isValidLine(x: unknown): x is RawLine {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  if (typeof r.quantity !== "number" || r.quantity < 1) return false;
  if (r.kind === "variant" && typeof r.productVariantId === "string") return true;
  if (r.kind === "drop_box" && typeof r.dropId === "string") return true;
  if (r.kind === "drop_dozen" && typeof r.dropItemId === "string") return true;
  return false;
}

// ---------------------------------------------------------------------------
// Line-key utilities
// ---------------------------------------------------------------------------

export function lineIdOf(key: LineKey): string {
  if (key.kind === "variant") return `v:${key.productVariantId}`;
  if (key.kind === "drop_box") return `b:${key.dropId}`;
  return `d:${key.dropItemId}`;
}

export function lineKeyFromId(id: string): LineKey | null {
  const [k, rest] = id.split(":", 2);
  if (!rest) return null;
  if (k === "v") return { kind: "variant", productVariantId: rest };
  if (k === "b") return { kind: "drop_box", dropId: rest };
  if (k === "d") return { kind: "drop_dozen", dropItemId: rest };
  return null;
}

function sameLine(a: LineKey, b: LineKey): boolean {
  return lineIdOf(a) === lineIdOf(b);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

// ---------------------------------------------------------------------------
// DB cart helpers
// ---------------------------------------------------------------------------

async function getOrCreateDbCart(userId: string): Promise<string> {
  const existing = await db.query.carts.findFirst({
    where: (t, { eq }) => eq(t.userId, userId),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const [row] = await db
    .insert(carts)
    .values({ userId })
    .returning({ id: carts.id });
  return row.id;
}

async function readDbLines(cartId: string): Promise<RawLine[]> {
  const rows = await db.query.cartItems.findMany({
    where: (t, { eq }) => eq(t.cartId, cartId),
  });
  return rows.map((r): RawLine => {
    if (r.productVariantId)
      return { kind: "variant", productVariantId: r.productVariantId, quantity: r.quantity };
    if (r.dropId)
      return { kind: "drop_box", dropId: r.dropId, quantity: r.quantity };
    return { kind: "drop_dozen", dropItemId: r.dropItemId!, quantity: r.quantity };
  });
}

async function addOrIncrementDbLine(cartId: string, line: RawLine) {
  const condition =
    line.kind === "variant"
      ? and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productVariantId, line.productVariantId),
        )
      : line.kind === "drop_box"
        ? and(eq(cartItems.cartId, cartId), eq(cartItems.dropId, line.dropId))
        : and(
            eq(cartItems.cartId, cartId),
            eq(cartItems.dropItemId, line.dropItemId),
          );

  const existing = await db.query.cartItems.findFirst({ where: condition });
  if (existing) {
    const newQty = clamp(existing.quantity + line.quantity, 1, MAX_QTY);
    await db
      .update(cartItems)
      .set({ quantity: newQty })
      .where(eq(cartItems.id, existing.id));
    return;
  }

  const insertValues = {
    cartId,
    quantity: clamp(line.quantity, 1, MAX_QTY),
    productVariantId:
      line.kind === "variant" ? line.productVariantId : null,
    dropId: line.kind === "drop_box" ? line.dropId : null,
    dropItemId: line.kind === "drop_dozen" ? line.dropItemId : null,
  };
  await db.insert(cartItems).values(insertValues);
}

async function setDbLineQuantity(cartId: string, key: LineKey, quantity: number) {
  if (quantity <= 0) {
    await removeDbLine(cartId, key);
    return;
  }
  const condition =
    key.kind === "variant"
      ? and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productVariantId, key.productVariantId),
        )
      : key.kind === "drop_box"
        ? and(eq(cartItems.cartId, cartId), eq(cartItems.dropId, key.dropId))
        : and(
            eq(cartItems.cartId, cartId),
            eq(cartItems.dropItemId, key.dropItemId),
          );
  await db
    .update(cartItems)
    .set({ quantity: clamp(quantity, 1, MAX_QTY) })
    .where(condition);
}

async function removeDbLine(cartId: string, key: LineKey) {
  const condition =
    key.kind === "variant"
      ? and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productVariantId, key.productVariantId),
        )
      : key.kind === "drop_box"
        ? and(eq(cartItems.cartId, cartId), eq(cartItems.dropId, key.dropId))
        : and(
            eq(cartItems.cartId, cartId),
            eq(cartItems.dropItemId, key.dropItemId),
          );
  await db.delete(cartItems).where(condition);
}

// ---------------------------------------------------------------------------
// Resolution — turn raw lines into ResolvedLine[] with current prices/names.
// ---------------------------------------------------------------------------

async function resolve(rawLines: RawLine[]): Promise<ResolvedLine[]> {
  const variantIds = rawLines.filter((l) => l.kind === "variant").map((l) => (l as Extract<RawLine, {kind: "variant"}>).productVariantId);
  const dropBoxIds = rawLines.filter((l) => l.kind === "drop_box").map((l) => (l as Extract<RawLine, {kind: "drop_box"}>).dropId);
  const dropDozenIds = rawLines.filter((l) => l.kind === "drop_dozen").map((l) => (l as Extract<RawLine, {kind: "drop_dozen"}>).dropItemId);

  // Each variant / drop-item join also LEFT JOINs the primary product image.
  // Multiple-image-per-product means the join could match multiple rows;
  // restricting to is_primary=true keeps it 1:1 (or 1:0).
  const [variantRows, dropRows, dropItemRows] = await Promise.all([
    variantIds.length
      ? db
          .select({
            id: productVariants.id,
            label: productVariants.label,
            priceCents: productVariants.priceCents,
            productName: products.name,
            productImage: productImages.url,
            isAvailable: productVariants.isAvailable,
          })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .leftJoin(
            productImages,
            and(
              eq(productImages.productId, products.id),
              eq(productImages.isPrimary, true),
            ),
          )
          .where(inArray(productVariants.id, variantIds))
      : Promise.resolve([] as const),
    dropBoxIds.length
      ? db
          .select({
            id: drops.id,
            name: drops.name,
            assortedBoxPriceCents: drops.assortedBoxPriceCents,
            isPublished: drops.isPublished,
          })
          .from(drops)
          .where(inArray(drops.id, dropBoxIds))
      : Promise.resolve([] as const),
    dropDozenIds.length
      ? db
          .select({
            id: dropItems.id,
            dozenPriceCents: dropItems.dozenPriceCents,
            productName: products.name,
            productImage: productImages.url,
          })
          .from(dropItems)
          .innerJoin(cookieBoxItems, eq(dropItems.cookieBoxItemId, cookieBoxItems.id))
          .innerJoin(products, eq(cookieBoxItems.productId, products.id))
          .leftJoin(
            productImages,
            and(
              eq(productImages.productId, products.id),
              eq(productImages.isPrimary, true),
            ),
          )
          .where(inArray(dropItems.id, dropDozenIds))
      : Promise.resolve([] as const),
  ]);

  const variantMap = new Map(variantRows.map((r) => [r.id, r]));
  const dropMap = new Map(dropRows.map((r) => [r.id, r]));
  const dropItemMap = new Map(dropItemRows.map((r) => [r.id, r]));

  const resolved: ResolvedLine[] = [];
  for (const line of rawLines) {
    if (line.kind === "variant") {
      const v = variantMap.get(line.productVariantId);
      if (!v) continue; // skip stale/deleted lines
      resolved.push({
        ...line,
        name: v.productName,
        variantLabel: v.label,
        unitPriceCents: v.priceCents,
        imageUrl: v.productImage,
        lineId: lineIdOf(line),
      });
    } else if (line.kind === "drop_box") {
      const d = dropMap.get(line.dropId);
      if (!d || d.assortedBoxPriceCents == null) continue;
      resolved.push({
        ...line,
        name: `${d.name} — Assorted Box`,
        unitPriceCents: d.assortedBoxPriceCents,
        imageUrl: null,
        lineId: lineIdOf(line),
      });
    } else {
      const di = dropItemMap.get(line.dropItemId);
      if (!di) continue;
      resolved.push({
        ...line,
        name: `${di.productName} — Dozen`,
        unitPriceCents: di.dozenPriceCents,
        imageUrl: di.productImage,
        lineId: lineIdOf(line),
      });
    }
  }
  return resolved;
}

function totalize(lines: ResolvedLine[]): { subtotalCents: number; itemCount: number } {
  let subtotalCents = 0;
  let itemCount = 0;
  for (const l of lines) {
    subtotalCents += l.unitPriceCents * l.quantity;
    itemCount += l.quantity;
  }
  return { subtotalCents, itemCount };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getCart(): Promise<Cart> {
  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    const cartId = await getOrCreateDbCart(userId);
    const cookieLines = await readCookieLines();
    if (cookieLines.length > 0) {
      // Merge cookie cart into DB on the first authenticated request after
      // sign-in, then clear the cookie so we don't double-merge.
      for (const line of cookieLines) {
        await addOrIncrementDbLine(cartId, line);
      }
      await writeCookieLines([]);
    }
    const dbLines = await readDbLines(cartId);
    const resolved = await resolve(dbLines);
    return { lines: resolved, ...totalize(resolved) };
  }

  const cookieLines = await readCookieLines();
  const resolved = await resolve(cookieLines);
  return { lines: resolved, ...totalize(resolved) };
}

export async function addLine(line: RawLine): Promise<void> {
  const safe: RawLine = { ...line, quantity: clamp(line.quantity, 1, MAX_QTY) } as RawLine;
  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    const cartId = await getOrCreateDbCart(userId);
    await addOrIncrementDbLine(cartId, safe);
    return;
  }

  const lines = await readCookieLines();
  const idx = lines.findIndex((l) => sameLine(l, safe));
  if (idx >= 0) {
    lines[idx] = {
      ...lines[idx],
      quantity: clamp(lines[idx].quantity + safe.quantity, 1, MAX_QTY),
    };
  } else {
    if (lines.length >= MAX_LINES) return; // silently drop overflow
    lines.push(safe);
  }
  await writeCookieLines(lines);
}

export async function updateQuantity(key: LineKey, quantity: number): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    const cartId = await getOrCreateDbCart(userId);
    await setDbLineQuantity(cartId, key, quantity);
    return;
  }

  const lines = await readCookieLines();
  const idx = lines.findIndex((l) => sameLine(l, key));
  if (idx < 0) return;
  if (quantity <= 0) {
    lines.splice(idx, 1);
  } else {
    lines[idx] = { ...lines[idx], quantity: clamp(quantity, 1, MAX_QTY) };
  }
  await writeCookieLines(lines);
}

export async function removeLine(key: LineKey): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    const cartId = await getOrCreateDbCart(userId);
    await removeDbLine(cartId, key);
    return;
  }

  const lines = await readCookieLines();
  const next = lines.filter((l) => !sameLine(l, key));
  await writeCookieLines(next);
}

export async function clearCart(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    const cartId = await getOrCreateDbCart(userId);
    await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
    return;
  }
  await writeCookieLines([]);
}

/** Header badge / quick count without resolving prices. */
export async function getCartCount(): Promise<number> {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    const cartId = await getOrCreateDbCart(userId);
    const rows = await db
      .select({ qty: cartItems.quantity })
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));
    return rows.reduce((s, r) => s + r.qty, 0);
  }
  const lines = await readCookieLines();
  return lines.reduce((s, l) => s + l.quantity, 0);
}
