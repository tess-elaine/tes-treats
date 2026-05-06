import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { requireUser } from "@/lib/auth-helpers";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "My custom requests" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Received — awaiting review",
  reviewing: "Tess is reviewing",
  needs_info: "Tess needs more info",
  quoted: "Quote ready",
  declined: "Declined",
  paid: "Paid — in queue",
  in_kitchen: "Tess is baking",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export default async function MyCustomRequestsPage() {
  const user = await requireUser("/account/custom-requests");
  const list = await db.query.customRequests.findMany({
    where: (t, { eq }) => eq(t.userId, user.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-4xl">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Your account
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
          Custom requests
        </h1>

        {list.length === 0 ? (
          <NibbleCard className="mt-10 p-10 text-center">
            <p className="text-tertiary">
              You haven&rsquo;t sent Tess any custom requests yet.
            </p>
            <div className="mt-6">
              <BiteButton href="/custom" size="lg">
                Start a custom request
              </BiteButton>
            </div>
          </NibbleCard>
        ) : (
          <ul className="mt-10 space-y-4">
            {list.map((r) => (
              <NibbleCard key={r.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                      {formatDate(r.createdAt, { dateStyle: "medium" })}
                      {r.occasion ? ` · ${r.occasion}` : ""}
                    </p>
                    <h3 className="mt-1 font-headline text-xl font-bold text-primary">
                      Request {r.number}
                    </h3>
                    <p className="mt-2 line-clamp-2 max-w-prose text-sm text-tertiary">
                      {r.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </p>
                    {r.quoteCents != null ? (
                      <p className="mt-1 font-headline text-xl font-bold text-on-surface">
                        {formatCents(r.quoteCents)}
                      </p>
                    ) : null}
                    {r.status === "quoted" && r.stripePaymentLinkUrl ? (
                      <Link
                        href={r.stripePaymentLinkUrl}
                        className="mt-2 inline-block font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                      >
                        Pay quote →
                      </Link>
                    ) : null}
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
