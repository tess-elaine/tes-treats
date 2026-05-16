"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminPagination({
  page,
  pageCount,
  total,
  searchString,
}: {
  page: number;
  pageCount: number;
  total: number;
  searchString: string;
}) {
  const pathname = usePathname();

  function buildHref(p: number) {
    const params = new URLSearchParams(searchString);
    if (p <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const prevPage = page <= 1 ? pageCount : page - 1;
  const nextPage = page >= pageCount ? 1 : page + 1;

  return (
    <div className="flex items-center justify-between border-t border-outline-variant/15 px-4 py-3">
      {pageCount > 1 ? (
        <Link
          href={buildHref(prevPage)}
          className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
        >
          ← Prev
        </Link>
      ) : (
        <span />
      )}

      <p className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
        {total} result{total !== 1 ? "s" : ""}
        {pageCount > 1 && (
          <>
            {" · "}page {page} of {pageCount}
          </>
        )}
      </p>

      {pageCount > 1 ? (
        <Link
          href={buildHref(nextPage)}
          className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
