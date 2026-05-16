"use client";

import { useRouter, usePathname } from "next/navigation";

type SortDir = "asc" | "desc";

export function AdminSortTh({
  column,
  defaultOrder = "asc",
  currentSort,
  currentOrder,
  searchString,
  children,
  className,
}: {
  column: string;
  defaultOrder?: SortDir;
  currentSort: string;
  currentOrder: string;
  searchString: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = currentSort === column;
  const activeOrder = isActive ? (currentOrder as SortDir) : null;

  function handleClick() {
    const params = new URLSearchParams(searchString);
    params.delete("page");

    if (!isActive) {
      params.set("sort", column);
      params.set("order", defaultOrder);
    } else if (activeOrder === defaultOrder) {
      params.set("sort", column);
      params.set("order", defaultOrder === "asc" ? "desc" : "asc");
    } else {
      params.delete("sort");
      params.delete("order");
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const icon = isActive
    ? activeOrder === "asc"
      ? "↑"
      : "↓"
    : "↕";

  return (
    <th
      onClick={handleClick}
      className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-on-surface ${className ?? ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span
          className={`text-[10px] transition-colors ${
            isActive ? "text-primary" : "opacity-25"
          }`}
        >
          {icon}
        </span>
      </span>
    </th>
  );
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
