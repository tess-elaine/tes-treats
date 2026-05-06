/**
 * Currency / formatting helpers. Always work with cents internally; only
 * format at the boundary (UI).
 */
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return usd.format(cents / 100);
}

export function formatDate(date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", opts ?? { dateStyle: "medium" }).format(d);
}
