import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSortTh, Th } from "@/components/admin/admin-sort-th";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { db } from "@/db";
import { drops } from "@/db/schema/drops";
import { cookieBoxes } from "@/db/schema/drops";
import { ilike, and, eq, asc, desc, sql } from "drizzle-orm";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "Admin · Drops" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminDropsPage({
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
    q ? ilike(drops.name, `%${q}%`) : undefined,
    statusFilter === "published"
      ? eq(drops.isPublished, true)
      : statusFilter === "draft"
        ? eq(drops.isPublished, false)
        : undefined,
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(drops)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const sortExpr = (() => {
    const dir = order === "asc" ? asc : desc;
    if (sort === "name") return dir(drops.name);
    if (sort === "closes") return dir(drops.closesAt);
    if (sort === "price") return dir(drops.assortedBoxPriceCents);
    if (sort === "status") return dir(drops.isPublished);
    return desc(drops.opensAt);
  })();

  const list = await db
    .select({
      id: drops.id,
      name: drops.name,
      opensAt: drops.opensAt,
      closesAt: drops.closesAt,
      assortedBoxPriceCents: drops.assortedBoxPriceCents,
      assortedBoxInventory: drops.assortedBoxInventory,
      assortedBoxSold: drops.assortedBoxSold,
      isPublished: drops.isPublished,
      cookieBoxName: cookieBoxes.name,
    })
    .from(drops)
    .leftJoin(cookieBoxes, eq(drops.cookieBoxId, cookieBoxes.id))
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
    return qs ? `/admin/drops?${qs}` : "/admin/drops";
  }

  const isEmpty = list.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">Treat drops</p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">Drops</h1>
        </div>
        <BiteButton href="/admin/drops/new" size="md">+ New drop</BiteButton>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch defaultValue={q} searchString={searchString} placeholder="Search drops…" />
        <nav className="flex flex-wrap gap-2">
          <FilterPill href={filterHref(null)} label="All" active={!statusFilter} />
          <FilterPill href={filterHref("published")} label="Published" active={statusFilter === "published"} />
          <FilterPill href={filterHref("draft")} label="Draft" active={statusFilter === "draft"} />
        </nav>
      </div>

      <NibbleCard bite="none" className="overflow-hidden">
        {isEmpty ? (
          <p className="p-10 text-center text-tertiary">
            {q || statusFilter ? "No drops match your search." : "No drops scheduled yet."}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <AdminSortTh column="name" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Name</AdminSortTh>
                <Th>Box</Th>
                <AdminSortTh column="opens" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Opens</AdminSortTh>
                <AdminSortTh column="closes" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Closes</AdminSortTh>
                <AdminSortTh column="price" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Box price</AdminSortTh>
                <Th>Inventory</Th>
                <AdminSortTh column="status" defaultOrder="desc" currentSort={sort} currentOrder={order} searchString={searchString}>Status</AdminSortTh>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className="border-t border-outline-variant/15">
                  <Td>
                    <Link href={`/admin/drops/${d.id}`} className="font-medium text-primary hover:underline">
                      {d.name}
                    </Link>
                  </Td>
                  <Td>
                    {d.cookieBoxName ? (
                      <span className="text-sm text-on-surface-variant">{d.cookieBoxName}</span>
                    ) : (
                      <span className="text-sm text-on-surface-variant/50">—</span>
                    )}
                  </Td>
                  <Td>{formatDate(d.opensAt)}</Td>
                  <Td>{formatDate(d.closesAt)}</Td>
                  <Td>{d.assortedBoxPriceCents != null ? formatCents(d.assortedBoxPriceCents) : "—"}</Td>
                  <Td>
                    {d.assortedBoxInventory == null
                      ? "Unlimited"
                      : `${d.assortedBoxSold}/${d.assortedBoxInventory}`}
                  </Td>
                  <Td>{d.isPublished ? "Published" : "Draft"}</Td>
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
