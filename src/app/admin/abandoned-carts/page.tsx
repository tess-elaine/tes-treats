import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { eq, desc } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { formatCents, formatDate } from "@/lib/format";

type Order = InferSelectModel<typeof orders>;

export const metadata = { title: "Admin · Abandoned Carts" };
export const dynamic = "force-dynamic";

function cartAge(createdAt: Date): string {
  const diffMs = Date.now() - createdAt.getTime();
  const mins = diffMs / 60_000;
  if (mins < 60) return `${Math.max(1, Math.floor(mins))}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  return `${Math.floor(days)}d ago`;
}

export default async function AbandonedCartsPage() {
  const list = await db
    .select()
    .from(orders)
    .where(eq(orders.status, "pending"))
    .orderBy(desc(orders.createdAt))
    .limit(500);

  // Split into very recent (likely still in-progress) vs genuinely abandoned
  const cutoff = Date.now() - 15 * 60_000; // 15 minutes
  const inProgress = list.filter((o) => o.createdAt.getTime() > cutoff);
  const abandoned = list.filter((o) => o.createdAt.getTime() <= cutoff);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Order book
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
          Abandoned Carts
        </h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
          Checkouts that were started but never paid. Carts under 15 minutes
          old may still be in progress.{" "}
          <Link href="/admin/orders" className="text-primary hover:underline">
            ← All orders
          </Link>
        </p>
      </header>

      {inProgress.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            Possibly in progress ({inProgress.length})
          </h2>
          <CartTable rows={inProgress} dim />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
          Abandoned ({abandoned.length})
        </h2>
        {abandoned.length === 0 ? (
          <NibbleCard bite="none" className="p-10 text-center">
            <p className="text-tertiary">No abandoned carts.</p>
          </NibbleCard>
        ) : (
          <CartTable rows={abandoned} />
        )}
      </section>
    </div>
  );
}

function CartTable({ rows, dim }: { rows: Order[]; dim?: boolean }) {
  return (
    <NibbleCard
      bite="none"
      className={`overflow-hidden ${dim ? "opacity-60" : ""}`}
    >
      <table className="w-full text-left">
        <thead className="bg-surface-container-low">
          <tr>
            <Th>Number</Th>
            <Th>Customer</Th>
            <Th>Fulfillment</Th>
            <Th>Cart value</Th>
            <Th>Age</Th>
            <Th>Started</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t border-outline-variant/15">
              <Td>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {o.number}
                </Link>
              </Td>
              <Td>{o.email}</Td>
              <Td className="capitalize">{o.fulfillment}</Td>
              <Td>{formatCents(o.totalCents)}</Td>
              <Td className="tabular-nums text-on-surface-variant">
                {cartAge(o.createdAt)}
              </Td>
              <Td>{formatDate(o.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </NibbleCard>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
      {children}
    </th>
  );
}
function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
