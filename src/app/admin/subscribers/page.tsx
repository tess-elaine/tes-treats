import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSortTh, Th } from "@/components/admin/admin-sort-th";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { db } from "@/db";
import { dropSubscribers } from "@/db/schema/drops";
import { ilike, and, isNull, isNotNull, asc, desc, sql } from "drizzle-orm";
import { formatDate } from "@/lib/format";
import Link from "next/link";

export const metadata = { title: "Admin · Subscribers" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminSubscribersPage({
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

  const where = and(
    q ? ilike(dropSubscribers.email, `%${q}%`) : undefined,
    statusFilter === "active"
      ? isNull(dropSubscribers.unsubscribedAt)
      : statusFilter === "unsubscribed"
        ? isNotNull(dropSubscribers.unsubscribedAt)
        : undefined,
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(dropSubscribers)
    .where(where);

  // For summary stats, get the overall active count (ignoring current search/filter)
  const [{ activeCount }] = await db
    .select({ activeCount: sql<number>`count(*)::int` })
    .from(dropSubscribers)
    .where(isNull(dropSubscribers.unsubscribedAt));

  const [{ allCount }] = await db
    .select({ allCount: sql<number>`count(*)::int` })
    .from(dropSubscribers);

  const pageCount = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const sortExpr = (() => {
    const dir = order === "asc" ? asc : desc;
    if (sort === "email") return dir(dropSubscribers.email);
    if (sort === "source") return dir(dropSubscribers.source);
    if (sort === "unsubscribed") return dir(dropSubscribers.unsubscribedAt);
    return desc(dropSubscribers.subscribedAt);
  })();

  const list = await db
    .select()
    .from(dropSubscribers)
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
    return qs ? `/admin/subscribers?${qs}` : "/admin/subscribers";
  }

  const isEmpty = list.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">Mailing list</p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">Drop subscribers</h1>
          <p className="mt-2 text-tertiary">
            {Number(activeCount)} active · {Number(allCount) - Number(activeCount)} unsubscribed
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href="/admin/subscribers/export"
            className="rounded-md bg-secondary-container px-4 py-2 font-headline text-sm font-bold text-on-secondary-container hover:bg-secondary-fixed"
            download
          >
            Export active CSV
          </a>
          <a
            href="/admin/subscribers/export?all=1"
            className="rounded-md bg-surface-container-high px-4 py-2 font-headline text-sm font-bold text-on-surface hover:bg-surface-container-highest"
            download
          >
            Export all CSV
          </a>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch defaultValue={q} searchString={searchString} placeholder="Search email…" />
        <nav className="flex flex-wrap gap-2">
          <FilterPill href={filterHref(null)} label="All" active={!statusFilter} />
          <FilterPill href={filterHref("active")} label="Active" active={statusFilter === "active"} />
          <FilterPill href={filterHref("unsubscribed")} label="Unsubscribed" active={statusFilter === "unsubscribed"} />
        </nav>
      </div>

      <NibbleCard bite="none" className="overflow-hidden">
        {isEmpty ? (
          <p className="p-10 text-center text-tertiary">
            {q || statusFilter ? "No subscribers match your search." : "No subscribers yet."}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <AdminSortTh column="email" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Email</AdminSortTh>
                <AdminSortTh column="source" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Source</AdminSortTh>
                <AdminSortTh column="subscribed" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Subscribed</AdminSortTh>
                <AdminSortTh column="unsubscribed" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Unsubscribed</AdminSortTh>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-outline-variant/15">
                  <Td>{s.email}</Td>
                  <Td>{s.source ?? "—"}</Td>
                  <Td>{formatDate(s.subscribedAt, { dateStyle: "medium", timeStyle: "short" })}</Td>
                  <Td>{s.unsubscribedAt ? formatDate(s.unsubscribedAt, { dateStyle: "medium" }) : "—"}</Td>
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
    <Link href={href} className={`rounded-full px-3 py-1 font-label text-xs uppercase tracking-[0.12em] transition-colors ${active ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary"}`}>
      {label}
    </Link>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}
