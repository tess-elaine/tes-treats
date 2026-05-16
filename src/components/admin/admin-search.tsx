"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef } from "react";

export function AdminSearch({
  defaultValue,
  searchString,
  placeholder = "Search…",
}: {
  defaultValue: string;
  searchString: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchString);
      params.delete("page");
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, 400);
  }

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder={placeholder}
      className="h-9 w-full max-w-xs rounded-lg bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 border-0"
    />
  );
}
