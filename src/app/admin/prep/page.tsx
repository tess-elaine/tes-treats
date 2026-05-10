import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { formatDate } from "@/lib/format";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Prep sheet" };
export const dynamic = "force-dynamic";

export default async function PrepSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date } = await searchParams;

  // Default to today
  const targetDate = date
    ? new Date(date + "T00:00:00")
    : new Date(new Date().toDateString());
  const dayStart = new Date(targetDate);
  const dayEnd = new Date(targetDate);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Fetch all paid/in_kitchen/ready orders for the selected fulfillment date
  const relevantOrders = await db.query.orders.findMany({
    where: (t, { and, inArray, gte, lt }) =>
      and(
        inArray(t.status, ["paid", "in_kitchen", "ready"]),
        gte(t.fulfillmentDate, dayStart),
        lt(t.fulfillmentDate, dayEnd)
      ),
    with: {
      items: {
        with: {
          productVariant: {
            columns: { unitCount: true, productId: true },
          },
        },
      },
    },
  });

  // Aggregate ingredient totals
  // Map: ingredientId → { name, unit, total }
  const totals = new Map<
    string,
    { name: string; unit: string; total: number }
  >();

  for (const order of relevantOrders) {
    for (const item of order.items) {
      if (!item.productVariantId || !item.productVariant) continue;
      const unitCount = item.productVariant.unitCount ?? 1;
      const productId = item.productVariant.productId;
      const totalItems = item.quantity * unitCount;

      const productIngredients = await db.query.productIngredients.findMany({
        where: (t, { eq }) => eq(t.productId, productId),
        with: { ingredient: { columns: { id: true, name: true } } },
      });

      for (const pi of productIngredients) {
        const qty = parseFloat(pi.quantityPerUnit) * totalItems;
        const key = pi.ingredient.id;
        const existing = totals.get(key);
        if (existing) {
          existing.total += qty;
        } else {
          totals.set(key, { name: pi.ingredient.name, unit: pi.unit, total: qty });
        }
      }
    }
  }

  const sorted = [...totals.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const hasOrders = relevantOrders.length > 0;
  const totalOrderCount = relevantOrders.length;
  const totalItemCount = relevantOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  return (
    <>
      {/* Print header — only visible when printing */}
      <div className="hidden print:block mb-6">
        <p className="font-headline text-2xl font-extrabold text-primary">TES Treats</p>
        <p className="text-sm text-on-surface-variant">
          Prep sheet · {formatDate(targetDate, { dateStyle: "full" })}
        </p>
      </div>

      {/* Screen header */}
      <div className="print:hidden">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Admin
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-headline text-3xl font-extrabold text-primary">
            Prep sheet
          </h1>
          {hasOrders && <PrintButton />}
        </div>

        {/* Date picker */}
        <form method="GET" className="mt-6 flex items-center gap-3">
          <label className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            Fulfillment date
          </label>
          <input
            type="date"
            name="date"
            defaultValue={targetDate.toISOString().slice(0, 10)}
            className="ghost-border rounded-md bg-surface-container-high px-3 py-2 text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:bg-primary/90"
          >
            Show
          </button>
        </form>
      </div>

      {/* Summary */}
      <div className="mt-8">
        <p className="text-sm text-on-surface-variant">
          {hasOrders
            ? `${totalOrderCount} order${totalOrderCount !== 1 ? "s" : ""} · ${totalItemCount} item${totalItemCount !== 1 ? "s" : ""} · fulfillment ${formatDate(targetDate, { dateStyle: "long" })}`
            : `No paid orders for ${formatDate(targetDate, { dateStyle: "long" })}.`}
        </p>
      </div>

      {hasOrders && sorted.length === 0 && (
        <p className="mt-6 text-sm text-on-surface-variant">
          Orders found, but no ingredients have been assigned to those products yet.{" "}
          <a href="/admin/ingredients" className="text-primary hover:underline print:hidden">
            Set up ingredients ↗
          </a>
        </p>
      )}

      {sorted.length > 0 && (
        <div className="mt-6">
          <h2 className="font-headline text-xl font-bold text-primary">
            Shopping list
          </h2>
          <ul className="mt-4 divide-y divide-outline-variant/40">
            {sorted.map((item) => (
              <li key={item.name} className="flex items-baseline justify-between py-3">
                <span className="font-medium text-on-surface">{item.name}</span>
                <span className="ml-4 text-right font-headline font-bold text-primary">
                  {formatQty(item.total)} {item.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Order detail — screen only */}
      {hasOrders && (
        <div className="mt-10 print:hidden">
          <h2 className="font-headline text-xl font-bold text-primary">Orders</h2>
          <ul className="mt-4 space-y-2">
            {relevantOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between text-sm">
                <a
                  href={`/admin/orders/${o.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {o.number}
                </a>
                <span className="text-on-surface-variant">
                  {o.firstName ?? o.email} · {o.fulfillment}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function formatQty(n: number): string {
  // Show up to 3 decimal places, strip trailing zeros
  return parseFloat(n.toFixed(3)).toString();
}
