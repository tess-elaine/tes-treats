import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSortTh, Th } from "@/components/admin/admin-sort-th";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { ilike, or, and, eq, asc, desc, sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { formatCents, formatDate } from "@/lib/format";

type Order = InferSelectModel<typeof orders>;

export const metadata = { title: "Admin · Abandoned Carts" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function cartAge(createdAt: Date): string {
  const diffMs = Date.now() - createdAt.getTime();
  const mins = diffMs / 60_000;
  if (mins < 60) return `${Math.max(1, Math.floor(mins))}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  return `${Math.floor(days)}d ago`;
}

export default async function AbandonedCartsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sort = params.sort ?? "";
  const order = params.order ?? "desc";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);

  const where = and(
    eq(orders.status, "pending"),
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

  const cutoff = Date.now() - 15 * 60_000;
  const inProgress = list.filter((o) => o.createdAt.getTime() > cutoff);
  const abandoned = list.filter((o) => o.createdAt.getTime() <= cutoff);

  const searchString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
  ).toString();

  return (
    <div className="space-y-6">
      <header>
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">Order book</p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">Abandoned Carts</h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
          Checkouts that were started but never paid. Carts under 15 minutes old may still be in progress.{" "}
          <Link href="/admin/orders" className="text-primary hover:underline">← All orders</Link>
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch defaultValue={q} searchString={searchString} placeholder="Search order # or email…" />
      </div>

      {inProgress.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            Possibly in progress ({inProgress.length})
          </h2>
          <CartTable rows={inProgress} dim sort={sort} order={order} searchString={searchString} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
          Abandoned ({abandoned.length})
        </h2>
        {abandoned.length === 0 && !q ? (
          <NibbleCard bite="none" className="p-10 text-center">
            <p className="text-tertiary">No abandoned carts.</p>
          </NibbleCard>
        ) : abandoned.length === 0 ? (
          <NibbleCard bite="none" className="p-10 text-center">
            <p className="text-tertiary">No results match your search.</p>
          </NibbleCard>
        ) : (
          <CartTable rows={abandoned} sort={sort} order={order} searchString={searchString} />
        )}
      </section>

      <div className="rounded-lg bg-surface-container-lowest shadow-chocolate">
        <AdminPagination page={safePage} pageCount={pageCount} total={Number(total)} searchString={searchString} />
      </div>
    </div>
  );
}

function CartTable({
  rows,
  dim,
  sort,
  order,
  searchString,
}: {
  rows: Order[];
  dim?: boolean;
  sort: string;
  order: string;
  searchString: string;
}) {
  return (
    <NibbleCard bite="none" className={`overflow-hidden ${dim ? "opacity-60" : ""}`}>
      <table className="w-full text-left">
        <thead className="bg-surface-container-low">
          <tr>
            <Th>Number</Th>
            <AdminSortTh column="email" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Customer</AdminSortTh>
            <Th>Fulfillment</Th>
            <AdminSortTh column="total" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Cart value</AdminSortTh>
            <Th>Age</Th>
            <AdminSortTh column="started" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Started</AdminSortTh>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t border-outline-variant/15">
              <Td>
                <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                  {o.number}
                </Link>
              </Td>
              <Td>{o.email}</Td>
              <Td className="capitalize">{o.fulfillment}</Td>
              <Td>{formatCents(o.totalCents)}</Td>
              <Td className="tabular-nums text-on-surface-variant">{cartAge(o.createdAt)}</Td>
              <Td>{formatDate(o.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </NibbleCard>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
