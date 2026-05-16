import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminSortTh, Th } from "@/components/admin/admin-sort-th";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { db } from "@/db";
import { cookieBoxes } from "@/db/schema/drops";
import { ilike, or, and, eq, asc, desc, sql } from "drizzle-orm";

export const metadata = { title: "Admin · Cookie Boxes" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminCookieBoxesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sort = params.sort ?? "";
  const order = params.order ?? "asc";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const visFilter = params.visibility ?? "";

  const where = and(
    q
      ? or(
          ilike(cookieBoxes.name, `%${q}%`),
          ilike(cookieBoxes.tagline, `%${q}%`),
        )
      : undefined,
    visFilter === "visible"
      ? eq(cookieBoxes.isHidden, false)
      : visFilter === "hidden"
        ? eq(cookieBoxes.isHidden, true)
        : undefined,
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(cookieBoxes)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const sortExpr = (() => {
    const dir = order === "desc" ? desc : asc;
    if (sort === "name") return dir(cookieBoxes.name);
    if (sort === "visible") return dir(cookieBoxes.isHidden);
    return asc(cookieBoxes.createdAt);
  })();

  const list = await db
    .select({
      id: cookieBoxes.id,
      name: cookieBoxes.name,
      tagline: cookieBoxes.tagline,
      isHidden: cookieBoxes.isHidden,
      itemCount: sql<number>`(select count(*)::int from "cookie_box_item" where "cookie_box_item"."cookie_box_id" = "cookie_box"."id")`,
      dropCount: sql<number>`(select count(*)::int from "drop" where "drop"."cookie_box_id" = "cookie_box"."id")`,
    })
    .from(cookieBoxes)
    .where(where)
    .orderBy(sortExpr)
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  const searchString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
  ).toString();

  function filterHref(vis: string | null) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sort) { p.set("sort", sort); p.set("order", order); }
    if (vis) p.set("visibility", vis);
    const qs = p.toString();
    return qs ? `/admin/cookie-boxes?${qs}` : "/admin/cookie-boxes";
  }

  const isEmpty = list.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">Catalog</p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">Cookie Boxes</h1>
          <p className="mt-2 text-tertiary">Create a box once, link it to a drop whenever you run it.</p>
        </div>
        <BiteButton href="/admin/cookie-boxes/new" size="md">+ New box</BiteButton>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch defaultValue={q} searchString={searchString} placeholder="Search boxes…" />
        <nav className="flex flex-wrap gap-2">
          <FilterPill href={filterHref(null)} label="All" active={!visFilter} />
          <FilterPill href={filterHref("visible")} label="Visible" active={visFilter === "visible"} />
          <FilterPill href={filterHref("hidden")} label="Hidden" active={visFilter === "hidden"} />
        </nav>
      </div>

      <NibbleCard bite="none" className="overflow-hidden">
        {isEmpty ? (
          <p className="p-10 text-center text-tertiary">
            {q || visFilter ? "No cookie boxes match your search." : "No cookie boxes yet."}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <AdminSortTh column="name" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Name</AdminSortTh>
                <Th>Cookies</Th>
                <Th>Drops</Th>
                <AdminSortTh column="visible" defaultOrder="asc" currentSort={sort} currentOrder={order} searchString={searchString}>Visibility</AdminSortTh>
              </tr>
            </thead>
            <tbody>
              {list.map((box) => (
                <tr key={box.id} className="border-t border-outline-variant/15">
                  <Td>
                    <Link href={`/admin/cookie-boxes/${box.id}`} className="font-medium text-primary hover:underline">
                      {box.name}
                    </Link>
                    {box.tagline ? <p className="text-xs text-on-surface-variant">{box.tagline}</p> : null}
                  </Td>
                  <Td>{box.itemCount}</Td>
                  <Td>{box.dropCount}</Td>
                  <Td>{box.isHidden ? "Hidden" : "Visible"}</Td>
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
