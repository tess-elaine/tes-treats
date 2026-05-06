import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { formatCents, formatDate } from "@/lib/format";
import {
  setQuoteAction,
  declineRequestAction,
  markStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCustomRequestDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const request = await db.query.customRequests.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!request) notFound();

  const photos = await db.query.customRequestPhotos.findMany({
    where: (t, { eq }) => eq(t.requestId, id),
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });

  return (
    <div className="space-y-8">
      <Link
        href="/admin/custom-requests"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All requests
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Custom request
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
            {request.number}
          </h1>
          <p className="mt-1 text-on-surface-variant">
            {formatDate(request.createdAt, { dateStyle: "long" })} ·{" "}
            <span className="capitalize">{request.status.replace(/_/g, " ")}</span>
          </p>
        </div>
        <form action={markStatusAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={request.id} />
          <select
            name="status"
            defaultValue={request.status}
            className="ghost-border rounded-md bg-surface-container-high px-3 py-2 font-body"
          >
            {[
              "submitted",
              "reviewing",
              "needs_info",
              "quoted",
              "paid",
              "in_kitchen",
              "fulfilled",
              "cancelled",
            ].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button
            type="submit"
            className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
          >
            Update
          </button>
        </form>
      </header>

      {error ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error === "stripe"
            ? "Couldn't create the Stripe payment link. Check STRIPE_SECRET_KEY."
            : "Something went wrong."}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <NibbleCard bite="none" className="p-6">
            <h2 className="font-headline text-xl font-bold text-primary">Customer</h2>
            <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
              <Row label="Name" value={request.name ?? "—"} />
              <Row label="Email" value={<a href={`mailto:${request.email}`} className="text-primary underline">{request.email}</a>} />
              <Row label="Phone" value={request.phone ?? "—"} />
              <Row label="Occasion" value={request.occasion ?? "—"} />
              <Row label="Desired date" value={request.desiredDate ? formatDate(request.desiredDate) : "—"} />
              <Row label="Servings" value={request.servings != null ? String(request.servings) : "—"} />
            </dl>
          </NibbleCard>

          <NibbleCard bite="none" className="p-6">
            <h2 className="font-headline text-xl font-bold text-primary">What they asked for</h2>
            <p className="mt-3 whitespace-pre-wrap text-on-surface">{request.description}</p>
          </NibbleCard>

          {photos.length > 0 ? (
            <NibbleCard bite="none" className="p-6">
              <h2 className="font-headline text-xl font-bold text-primary">Reference photos</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {photos.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="relative aspect-square overflow-hidden rounded-md bg-surface-container-high">
                      <Image src={p.url} alt={p.caption ?? "Reference photo"} fill sizes="50vw" className="object-cover" />
                    </div>
                  </a>
                ))}
              </div>
            </NibbleCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <NibbleCard bite="none" className="p-6">
            <h2 className="font-headline text-xl font-bold text-primary">Send a quote</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Generates a Stripe Payment Link and emails it to the customer.
            </p>
            <form action={setQuoteAction} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={request.id} />
              <label className="block">
                <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">Quote (USD)</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-headline text-lg text-on-surface-variant">$</span>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    defaultValue={request.quoteCents != null ? (request.quoteCents / 100).toFixed(2) : ""}
                    className="ghost-border w-full rounded-md bg-surface-container-high px-4 py-3 font-body"
                  />
                </div>
              </label>
              <label className="block">
                <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">Notes (visible to customer)</span>
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={request.quoteNotes ?? ""}
                  placeholder="Lead time, what's included, etc."
                  className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
                />
              </label>
              <BiteButton size="md" className="w-full">
                {request.quoteCents != null ? "Resend quote" : "Send quote"}
              </BiteButton>
            </form>

            {request.stripePaymentLinkUrl ? (
              <p className="mt-4 break-all rounded-md bg-surface-container-low p-3 text-xs text-on-surface-variant">
                Payment link: <a href={request.stripePaymentLinkUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{request.stripePaymentLinkUrl}</a>
              </p>
            ) : null}
          </NibbleCard>

          <NibbleCard bite="none" className="p-6">
            <h2 className="font-headline text-xl font-bold text-primary">Decline</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Marks the request declined and emails the customer.
            </p>
            <form action={declineRequestAction} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={request.id} />
              <textarea
                name="reason"
                rows={3}
                placeholder="Reason (optional, included in email)"
                className="ghost-border w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-error-container focus:outline-none"
              />
              <button
                type="submit"
                className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
              >
                Decline this request
              </button>
            </form>
          </NibbleCard>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">{label}</dt>
      <dd className="text-on-surface">{value}</dd>
    </>
  );
}
