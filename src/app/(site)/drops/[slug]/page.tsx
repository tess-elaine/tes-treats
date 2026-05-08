import { notFound } from "next/navigation";
import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { formatCents, formatDate } from "@/lib/format";
import { phaseOf, inventoryRemaining } from "@/lib/drops";
import { addToCartAction } from "@/app/(site)/cart/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drop = await db.query.drops.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
    columns: { name: true },
    with: { cookieBox: { columns: { tagline: true } } },
  });
  if (!drop) return { title: "Drop not found" };
  return { title: drop.name, description: drop.cookieBox?.tagline ?? undefined };
}

export default async function DropPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drop = await db.query.drops.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
    with: {
      cookieBox: true,
      items: {
        orderBy: (t, { asc }) => [asc(t.sortOrder)],
        with: {
          cookieBoxItem: { with: { product: true } },
        },
      },
    },
  });
  if (!drop || !drop.isPublished) notFound();

  const phase = phaseOf(drop);
  const isOpen = phase === "open";
  const boxRemaining = inventoryRemaining(drop.assortedBoxInventory, drop.assortedBoxSold);

  const tagline = drop.cookieBox?.tagline ?? null;
  const description = drop.cookieBox?.description ?? null;

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/drops"
          className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
        >
          ← All drops
        </Link>

        <header className="mt-6 grid gap-8 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
              {phase === "preorder"
                ? `Opens ${formatDate(drop.opensAt, { dateStyle: "long" })}`
                : phase === "open"
                  ? `Closes ${formatDate(drop.closesAt, { dateStyle: "long" })}`
                  : "Closed"}
            </p>
            <h1 className="mt-2 font-headline text-4xl font-extrabold leading-tight text-primary md:text-6xl">
              {drop.name}
            </h1>
            {tagline ? (
              <p className="mt-4 font-body text-lg text-tertiary">{tagline}</p>
            ) : null}
            {description ? (
              <p className="mt-6 font-body text-on-surface">{description}</p>
            ) : null}
            <p className="mt-6 text-sm text-on-surface-variant">
              Fulfillment: {formatDate(drop.fulfillmentStart)} —{" "}
              {formatDate(drop.fulfillmentEnd)}
            </p>
          </div>

          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-tertiary-fixed via-primary-fixed to-secondary-container shadow-chocolate-lg" />
        </header>

        {/* Assorted box CTA */}
        {drop.assortedBoxPriceCents != null ? (
          <NibbleCard className="mt-12 p-6 md:p-10">
            <div className="grid items-center gap-8 md:grid-cols-[2fr_1fr]">
              <div>
                <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                  The whole experience
                </p>
                <h2 className="mt-2 font-headline text-3xl font-bold text-primary">
                  Assorted Box
                </h2>
                <p className="mt-2 text-tertiary">
                  All {drop.items.length} cookies, hand-packed.
                </p>
                {boxRemaining != null ? (
                  <p className="mt-3 text-sm text-on-surface-variant">
                    {boxRemaining > 0
                      ? `${boxRemaining} ${boxRemaining === 1 ? "box" : "boxes"} left`
                      : "Sold out"}
                  </p>
                ) : null}
              </div>
              <div className="md:text-right">
                <p className="font-headline text-3xl font-bold text-on-surface">
                  {formatCents(drop.assortedBoxPriceCents)}
                </p>
                <form action={addToCartAction} className="mt-4">
                  <input type="hidden" name="kind" value="drop_box" />
                  <input type="hidden" name="dropId" value={drop.id} />
                  <input type="hidden" name="quantity" value={1} />
                  <BiteButton
                    size="lg"
                    className="w-full md:w-auto"
                    disabled={!isOpen || boxRemaining === 0}
                  >
                    {!isOpen
                      ? phase === "preorder"
                        ? "Opens soon"
                        : "Closed"
                      : boxRemaining === 0
                        ? "Sold out"
                        : "Add box to cart"}
                  </BiteButton>
                </form>
              </div>
            </div>
          </NibbleCard>
        ) : null}

        {/* Cookies in this box */}
        {drop.items.length > 0 ? (
          <>
            <h3 className="mt-16 font-headline text-2xl font-bold text-primary">
              Or grab a dozen of just one
            </h3>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {drop.items.map((di) => {
                const p = di.cookieBoxItem.product;
                const remaining = inventoryRemaining(di.dozenInventory, di.dozenSold);
                return (
                  <NibbleCard key={di.id} className="flex h-full flex-col">
                    <div className="aspect-[4/3] bg-gradient-to-br from-primary-fixed to-secondary-container" />
                    <div className="flex flex-1 flex-col p-6">
                      <h4 className="font-headline text-xl font-bold text-primary">{p.name}</h4>
                      {p.shortDescription ? (
                        <p className="mt-2 text-sm text-tertiary">{p.shortDescription}</p>
                      ) : null}
                      <div className="mt-auto flex items-end justify-between pt-6">
                        <div>
                          <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                            Dozen
                          </p>
                          <p className="font-headline text-2xl font-bold text-on-surface">
                            {formatCents(di.dozenPriceCents)}
                          </p>
                          {remaining != null ? (
                            <p className="text-xs text-on-surface-variant">
                              {remaining > 0 ? `${remaining} left` : "Sold out"}
                            </p>
                          ) : null}
                        </div>
                        <form action={addToCartAction}>
                          <input type="hidden" name="kind" value="drop_dozen" />
                          <input type="hidden" name="dropItemId" value={di.id} />
                          <input type="hidden" name="quantity" value={1} />
                          <BiteButton
                            size="md"
                            variant="secondary"
                            disabled={!isOpen || remaining === 0}
                          >
                            {!isOpen ? "—" : remaining === 0 ? "Sold out" : "Add dozen"}
                          </BiteButton>
                        </form>
                      </div>
                    </div>
                  </NibbleCard>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
