import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSortTh, Th } from "@/components/admin/admin-sort-th";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { db } from "@/db";
import { orders, orderStatus } from "@/db/schema/orders";
import { ilike, or, and, eq, inArray, asc, desc, sql } from "drizzle-orm";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "Admin · Orders" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUSES = orderStatus.enumValues;
type Status = (typeof STATUSES)[number];
type ListedStatus = Exclude<Status, "pending">;
const LISTED_STATUSES = STATUSES.filter((s): s is ListedStatus => s !== "pending");

const STATUS_LABEL: Record<string, string> = {
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
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sort = params.sort ?? "";
  const order = params.order ?? "desc";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const statusFilter = params.status ?? "";

  const activeStatus: ListedStatus | null =
    statusFilter && (LISTED_STATUSES as string[]).includes(statusFilter)
      ? (statusFilter as ListedStatus)
      : null;

  const where = and(
    inArray(orders.status, activeStatus ? [activeStatus] : LISTED_STATUSES),
    q
      ? or(ilike(orders.number, `%${q}%`), ilike(orders.email, `%${q}%`))
      : undefined,
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const sortExpr = (() => {
    const dir = order === "asc" ? asc : desc;
    if (sort === "number") return dir(orders.number);
    if (sort === "email") return dir(orders.email);
    if (sort === "total") return dir(orders.totalCents);
    return desc(orders.createdAt);
  })();

  const list = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(sortExpr)
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  const searchString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
  ).toString();

  function filterHref(status: string | null) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sort) { p.set("sort", sort); p.set("order", order); }
    if (status) p.set("status", status);
    const qs = p.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  const isEmpty = list.length === 0;
  const noResults = isEmpty && (q || activeStatus);

  return (
    <div className="space-y-6">
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

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch
          defaultValue={q}
          searchString={searchString}
          placeholder="Search order # or email…"
        />
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          <FilterPill href={filterHref(null)} label="All" active={!activeStatus} />
          {LISTED_STATUSES.map((s) => (
            <FilterPill
              key={s}
              href={filterHref(s)}
              label={STATUS_LABEL[s] ?? s}
              active={activeStatus === s}
            />
          ))}
        </nav>
      </div>

      <NibbleCard bite="none" className="overflow-hidden">
        {isEmpty ? (
          <p className="p-10 text-center text-tertiary">
            {noResults ? "No orders match your search." : "No orders yet."}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <AdminSortTh column="number" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Number</AdminSortTh>
                <AdminSortTh column="email" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Customer</AdminSortTh>
                <Th>Fulfillment</Th>
                <AdminSortTh column="total" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Total</AdminSortTh>
                <Th>Status</Th>
                <AdminSortTh column="placed" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Placed</AdminSortTh>
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
                  <Td>
                    <span className={`inline-block rounded-full px-2 py-0.5 font-label text-[10px] uppercase tracking-wider ${
                      o.fulfillment === "pickup"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary-container text-on-secondary-container"
                    }`}>
                      {o.fulfillment}
                    </span>
                    {o.fulfillmentDate && (
                      <span className="mt-0.5 block text-xs text-on-surface-variant">
                        {formatDate(o.fulfillmentDate)}
                      </span>
                    )}
                  </Td>
                  <Td>{formatCents(o.totalCents)}</Td>
                  <Td className="capitalize">{STATUS_LABEL[o.status] ?? o.status}</Td>
                  <Td>{formatDate(o.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <AdminPagination page={safePage} pageCount={pageCount} total={Number(total)} searchString={searchString} />
      </NibbleCard>
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

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
