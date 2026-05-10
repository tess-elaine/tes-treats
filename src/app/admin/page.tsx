import Link from "next/link";
import { count, eq, gt, inArray } from "drizzle-orm";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { customRequests } from "@/db/schema/custom_requests";
import { orders } from "@/db/schema/orders";
import { drops } from "@/db/schema/drops";
import { dropSubscribers } from "@/db/schema/drops";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "Admin · Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const [pendingRequests, pendingOrders, activeDrops, subscriberCount] =
    await Promise.all([
      db
        .select({ c: count() })
        .from(customRequests)
        .where(inArray(customRequests.status, ["submitted", "reviewing", "needs_info"]))
        .then((r) => r[0]?.c ?? 0),
      db
        .select({ c: count() })
        .from(orders)
        .where(inArray(orders.status, ["paid", "in_kitchen", "ready"]))
        .then((r) => r[0]?.c ?? 0),
      db
        .select({ c: count() })
        .from(drops)
        .where(eq(drops.isPublished, true)),
      db
        .select({ c: count() })
        .from(dropSubscribers)
        .then((r) => r[0]?.c ?? 0),
    ]);

  const upcomingDrops = await db
    .select()
    .from(drops)
    .where(gt(drops.closesAt, now))
    .orderBy(drops.opensAt)
    .limit(3);

  const recentRequests = await db.query.customRequests.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 5,
  });

  return (
    <div className="space-y-10">
      <header>
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Overview
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
          Today at TES Treats
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open requests" value={pendingRequests} href="/admin/custom-requests" />
        <Stat label="Orders in queue" value={pendingOrders} href="/admin/orders" />
        <Stat
          label="Published drops"
          value={activeDrops[0]?.c ?? 0}
          href="/admin/drops"
        />
        <Stat label="Email subscribers" value={subscriberCount} href="/admin/subscribers" />
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <NibbleCard bite="none" className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-headline text-xl font-bold text-primary">Upcoming drops</h2>
            <Link href="/admin/drops" className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline">
              Manage →
            </Link>
          </div>
          {upcomingDrops.length === 0 ? (
            <p className="mt-4 text-tertiary">No upcoming drops scheduled.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcomingDrops.map((d) => (
                <li key={d.id} className="flex items-center justify-between">
                  <div>
                    <Link href={`/admin/drops/${d.id}`} className="font-medium text-on-surface hover:text-primary">
                      {d.name}
                    </Link>
                    <p className="text-xs text-on-surface-variant">
                      Opens {formatDate(d.opensAt)} → closes {formatDate(d.closesAt)}
                    </p>
                  </div>
                  <p className="font-headline font-bold text-on-surface">
                    {formatCents(d.assortedBoxPriceCents)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </NibbleCard>

        <NibbleCard bite="none" className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-headline text-xl font-bold text-primary">Recent custom requests</h2>
            <Link href="/admin/custom-requests" className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline">
              All →
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="mt-4 text-tertiary">No custom requests yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentRequests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/custom-requests/${r.id}`}
                    className="block hover:bg-surface-container-low rounded-md p-2"
                  >
                    <p className="font-medium text-on-surface">
                      {r.number} · {r.name ?? r.email}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {formatDate(r.createdAt)} · {r.status.replace(/_/g, " ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </NibbleCard>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block h-full">
      <NibbleCard bite="none" className="h-full p-5 transition-colors hover:bg-surface-container-low">
        <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
          {label}
        </p>
        <p className="mt-2 font-headline text-4xl font-extrabold text-primary">
          {value}
        </p>
      </NibbleCard>
    </Link>
  );
}
