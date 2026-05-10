import Link from "next/link";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { customRequests } from "@/db/schema/custom_requests";
import { requireUser } from "@/lib/auth-helpers";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser("/account");

  const [recentOrders, recentRequests, orderCount, requestCount] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, user.id), ne(orders.status, "pending")))
      .orderBy(desc(orders.createdAt))
      .limit(3),
    db
      .select()
      .from(customRequests)
      .where(eq(customRequests.userId, user.id))
      .orderBy(desc(customRequests.createdAt))
      .limit(3),
    db
      .select({ c: count() })
      .from(orders)
      .where(and(eq(orders.userId, user.id), ne(orders.status, "pending")))
      .then((r) => r[0]?.c ?? 0),
    db
      .select({ c: count() })
      .from(customRequests)
      .where(eq(customRequests.userId, user.id))
      .then((r) => r[0]?.c ?? 0),
  ]);

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-5xl">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Welcome back
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
          Hi, {user.name?.split(" ")[0] ?? "friend"}.
        </h1>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <NibbleCard className="p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-headline text-2xl font-bold text-primary">Orders</h2>
              <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
                {orderCount} total
              </span>
            </div>
            {recentOrders.length === 0 ? (
              <p className="mt-4 text-tertiary">No orders yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/orders/${o.number}/confirmation`} className="flex justify-between hover:bg-surface-container-low rounded-md p-2">
                      <span>
                        <span className="font-medium text-on-surface">{o.number}</span>
                        <span className="ml-2 text-xs text-on-surface-variant">
                          {formatDate(o.createdAt)}
                        </span>
                      </span>
                      <span className="font-headline font-bold text-on-surface">
                        {formatCents(o.totalCents)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <BiteButton href="/account/orders" variant="ghost" size="md">
                View all orders →
              </BiteButton>
            </div>
          </NibbleCard>

          <NibbleCard className="p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-headline text-2xl font-bold text-primary">Custom requests</h2>
              <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
                {requestCount} total
              </span>
            </div>
            {recentRequests.length === 0 ? (
              <p className="mt-4 text-tertiary">
                Need something special?{" "}
                <Link href="/custom" className="text-primary hover:underline">Start a custom request</Link>.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {recentRequests.map((r) => (
                  <li key={r.id} className="flex justify-between">
                    <span>
                      <span className="font-medium text-on-surface">{r.number}</span>
                      <span className="ml-2 text-xs text-on-surface-variant capitalize">
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </span>
                    {r.quoteCents != null ? (
                      <span className="font-headline font-bold text-on-surface">
                        {formatCents(r.quoteCents)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <BiteButton href="/account/custom-requests" variant="ghost" size="md">
                View all requests →
              </BiteButton>
            </div>
          </NibbleCard>
        </div>
      </div>
    </section>
  );
}
