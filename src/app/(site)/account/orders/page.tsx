import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { requireUser } from "@/lib/auth-helpers";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  paid: "Paid — in queue",
  in_kitchen: "Tess is baking",
  ready: "Ready",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function MyOrdersPage() {
  const user = await requireUser("/account/orders");
  const list = await db.query.orders.findMany({
    where: (t, { eq, and, ne }) =>
      and(eq(t.userId, user.id), ne(t.status, "pending")),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-4xl">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Your account
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
          Orders
        </h1>

        {list.length === 0 ? (
          <NibbleCard className="mt-10 p-10 text-center">
            <p className="text-tertiary">You haven&rsquo;t placed any orders yet.</p>
            <div className="mt-6">
              <BiteButton href="/shop" size="lg">Shop the treats</BiteButton>
            </div>
          </NibbleCard>
        ) : (
          <ul className="mt-10 space-y-4">
            {list.map((o) => (
              <NibbleCard key={o.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                      {formatDate(o.createdAt, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                      {o.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                    </p>
                    <Link
                      href={`/orders/${o.number}/confirmation`}
                      className="mt-1 block font-headline text-xl font-bold text-primary hover:underline"
                    >
                      Order {o.number}
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                      {STATUS_LABEL[o.status] ?? o.status}
                    </p>
                    <p className="font-headline text-xl font-bold text-on-surface">
                      {formatCents(o.totalCents)}
                    </p>
                  </div>
                </div>
              </NibbleCard>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
