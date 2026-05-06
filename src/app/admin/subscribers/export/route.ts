/**
 * CSV export of drop subscribers. Admin-gated. Streams a Content-Disposition
 * download response so a click on the page downloads the file.
 *
 * Columns: email, source, subscribed_at, unsubscribed_at
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { dropSubscribers } from "@/db/schema/drops";
import { requireAdmin } from "@/lib/auth-helpers";
import { isNull } from "drizzle-orm";

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const includeUnsubscribed = url.searchParams.get("all") === "1";

  const rows = includeUnsubscribed
    ? await db.select().from(dropSubscribers).orderBy(dropSubscribers.subscribedAt)
    : await db
        .select()
        .from(dropSubscribers)
        .where(isNull(dropSubscribers.unsubscribedAt))
        .orderBy(dropSubscribers.subscribedAt);

  const lines = ["email,source,subscribed_at,unsubscribed_at"];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.email),
        csvEscape(r.source ?? null),
        r.subscribedAt.toISOString(),
        r.unsubscribedAt ? r.unsubscribedAt.toISOString() : "",
      ].join(","),
    );
  }
  const body = lines.join("\n") + "\n";
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = includeUnsubscribed
    ? `tes-treats-subscribers-all-${stamp}.csv`
    : `tes-treats-subscribers-${stamp}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
