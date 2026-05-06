import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { orders, orderStatus } from "@/db/schema/orders";
import { eq, desc } from "drizzle-orm";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "Admin · Orders" };
export const dynamic = "force-dynamic";

const STATUSES = orderStatus.enumValues;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  in_kitchen: "In kitchen",
  ready: "Ready",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as Status) ? (status as Status) : null;

  const list = filter
    ? await db
        .select()
        .from(orders)
        .where(eq(orders.status, filter))
        .orderBy(desc(orders.createdAt))
        .limit(200)
    : await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(200);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Order book
          </p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
            Orders
          </h1>
        </div>
      </header>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        <FilterPill href="/admin/orders" label="All" active={!filter} />
        {STATUSES.map((sval) => (
          <FilterPill
            key={sval}
            href={`/admin/orders?status=${sval}`}
            label={STATUS_LABEL[sval] ?? sval}
            active={filter === sval}
          />
        ))}
      </nav>

      {list.length === 0 ? (
        <NibbleCard bite="none" className="p-10 text-center">
          <p className="text-tertiary">
            {filter ? `No ${STATUS_LABEL[filter]?.toLowerCase()} orders.` : "No orders yet."}
          </p>
        </NibbleCard>
      ) : (
        <NibbleCard bite="none" className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Number</Th>
                <Th>Customer</Th>
                <Th>Fulfillment</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Placed</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-t border-outline-variant/15">
                  <Td>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                      {o.number}
                    </Link>
                  </Td>
                  <Td>{o.email}</Td>
                  <Td className="capitalize">{o.fulfillment}</Td>
                  <Td>{formatCents(o.totalCents)}</Td>
                  <Td className="capitalize">{STATUS_LABEL[o.status] ?? o.status}</Td>
                  <Td>{formatDate(o.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </NibbleCard>
      )}
    </div>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 font-label text-xs uppercase tracking-[0.12em] transition-colors ${
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
