import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSortTh, Th } from "@/components/admin/admin-sort-th";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { db } from "@/db";
import { customRequests } from "@/db/schema/custom_requests";
import { ilike, or, and, eq, asc, desc, sql } from "drizzle-orm";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "Admin · Custom requests" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_PILLS: Record<string, string> = {
  submitted: "bg-secondary-container text-on-secondary-container",
  reviewing: "bg-tertiary-fixed text-on-tertiary-fixed",
  needs_info: "bg-error-container text-on-error-container",
  quoted: "bg-primary-fixed text-on-primary-fixed",
  declined: "bg-surface-container-high text-on-surface-variant",
  paid: "bg-primary text-on-primary",
  in_kitchen: "bg-secondary-fixed text-on-secondary-fixed",
  fulfilled: "bg-surface-container-highest text-on-surface",
  cancelled: "bg-surface-container-high text-on-surface-variant",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "Reviewing",
  needs_info: "Needs info",
  quoted: "Quoted",
  declined: "Declined",
  paid: "Paid",
  in_kitchen: "In kitchen",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);

export default async function AdminCustomRequestsPage({
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

  const activeStatus =
    statusFilter && ALL_STATUSES.includes(statusFilter) ? statusFilter : null;

  const where = and(
    activeStatus
      ? eq(customRequests.status, activeStatus as (typeof customRequests.status)["_"]["data"])
      : undefined,
    q
      ? or(
          ilike(customRequests.number, `%${q}%`),
          ilike(customRequests.name, `%${q}%`),
          ilike(customRequests.email, `%${q}%`),
          ilike(customRequests.occasion, `%${q}%`),
        )
      : undefined,
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(customRequests)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const sortExpr = (() => {
    const dir = order === "asc" ? asc : desc;
    if (sort === "number") return dir(customRequests.number);
    if (sort === "name") return dir(customRequests.name);
    if (sort === "quote") return dir(customRequests.quoteCents);
    if (sort === "status") return dir(customRequests.status);
    return desc(customRequests.createdAt);
  })();

  const list = await db
    .select()
    .from(customRequests)
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
    return qs ? `/admin/custom-requests?${qs}` : "/admin/custom-requests";
  }

  const isEmpty = list.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">Inbox</p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">Custom requests</h1>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch defaultValue={q} searchString={searchString} placeholder="Search by #, name, email, occasion…" />
        <nav className="flex flex-wrap gap-2">
          <FilterPill href={filterHref(null)} label="All" active={!activeStatus} />
          {ALL_STATUSES.map((s) => (
            <FilterPill key={s} href={filterHref(s)} label={STATUS_LABELS[s] ?? s} active={activeStatus === s} />
          ))}
        </nav>
      </div>

      <NibbleCard bite="none" className="overflow-hidden">
        {isEmpty ? (
          <p className="p-10 text-center text-tertiary">
            {q || activeStatus ? "No requests match your search." : "No custom requests yet."}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
                <AdminSortTh column="number" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Number</AdminSortTh>
                <AdminSortTh column="name" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Customer</AdminSortTh>
                <Th>Occasion</Th>
                <AdminSortTh column="received" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Received</AdminSortTh>
                <AdminSortTh column="quote" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Quote</AdminSortTh>
                <AdminSortTh column="status" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Status</AdminSortTh>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-outline-variant/15">
                  <Td>
                    <Link href={`/admin/custom-requests/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.number}
                    </Link>
                  </Td>
                  <Td>
                    <div>
                      <p className="font-medium text-on-surface">{r.name ?? "—"}</p>
                      <p className="text-xs text-on-surface-variant">{r.email}</p>
                    </div>
                  </Td>
                  <Td>{r.occasion ?? "—"}</Td>
                  <Td>{formatDate(r.createdAt)}</Td>
                  <Td>{r.quoteCents != null ? formatCents(r.quoteCents) : "—"}</Td>
                  <Td>
                    <span className={`inline-block rounded-full px-2 py-1 font-label text-xs uppercase tracking-[0.12em] ${STATUS_PILLS[r.status] ?? ""}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </Td>
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
  return <td className="px-4 py-3 align-top">{children}</td>;
}
