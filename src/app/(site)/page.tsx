import Link from "next/link";
import Image from "next/image";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { IngredientChip } from "@/components/ui/ingredient-chip";
import { db } from "@/db";
import { nextDrop, phaseOf } from "@/lib/drops";
import { primaryImagesByProductIds } from "@/lib/products";
import { formatCents, formatDate } from "@/lib/format";
import { subscribeAction } from "@/app/(site)/drops/notify/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fan out independent queries in parallel.
  const [featuredRows, drop] = await Promise.all([
    db.query.products.findMany({
      where: (t, { and, eq }) =>
        and(eq(t.isAvailable, true), eq(t.isFeatured, true)),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
      limit: 3,
    }),
    nextDrop(),
  ]);

  const [featuredVariants, primaryImages] = await Promise.all([
    Promise.all(
      featuredRows.map(async (p) => {
        const v = await db.query.productVariants.findFirst({
          where: (t, { and, eq }) => and(eq(t.productId, p.id), eq(t.isAvailable, true)),
          orderBy: (t, { desc, asc }) => [desc(t.isDefault), asc(t.sortOrder)],
        });
        return { product: p, variant: v };
      }),
    ),
    primaryImagesByProductIds(featuredRows.map((p) => p.id)),
  ]);
  const featured = featuredVariants.map((fv) => ({
    ...fv,
    imageUrl: primaryImages.get(fv.product.id) ?? null,
  }));

  return (
    <>
      <Hero />
      <FeaturedSection items={featured} />
      <NextDropSection drop={drop} />
      <AboutTeaser />
      <NibblerListSection />
    </>
  );
}

/* ---------------------------------------------------------------------------
   Hero
   --------------------------------------------------------------------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-12 pt-16 md:pb-24 md:pt-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div className="relative z-10">
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Hand-finished in Buffalo, NY
          </p>
          <h1 className="mt-4 font-headline text-5xl font-black leading-[1.05] tracking-tight text-primary md:text-7xl">
            Treats with a <em className="not-italic text-secondary">tender</em> crumb,
            baked the slow way.
          </h1>
          <p className="mt-6 max-w-xl font-body text-lg text-tertiary">
            Small-batch cookies, pies, and seasonal cookie boxes from Tess Elaine Smith.
            Order online for local pickup or delivery, or commission something just for you.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <BiteButton href="/shop" size="lg">Shop the Treats</BiteButton>
            <BiteButton href="/drops" variant="ghost" size="lg">
              See the next drop →
            </BiteButton>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2">
            <IngredientChip tilt="left">European Butter</IngredientChip>
            <IngredientChip tilt="right">Real Vanilla</IngredientChip>
            <IngredientChip tilt="left">Slow-Mixed</IngredientChip>
          </ul>
        </div>

        <div className="relative">
          <div className="scalloped-bite relative aspect-square overflow-hidden shadow-chocolate-lg">
            <Image
              src="/brand/hero-1.jpg"
              alt="TES Treats brand mark — a cream cookie with a bite taken out"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <NibbleCard bite="none" className="absolute -bottom-10 -left-6 hidden max-w-xs p-6 md:block">
            <p className="font-body text-tertiary italic">
              &ldquo;Baking is how I tell people I love them. The cookies are just the messenger.&rdquo;
            </p>
            <p className="mt-3 font-label uppercase tracking-[0.12em] text-on-surface-variant">
              — Tess
            </p>
          </NibbleCard>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Featured products — wired to real DB data.
   --------------------------------------------------------------------------- */
function FeaturedSection({
  items,
}: {
  items: {
    product: { id: string; slug: string; name: string; shortDescription: string | null };
    variant: { label: string; priceCents: number } | undefined;
    imageUrl: string | null;
  }[];
}) {
  return (
    <section className="bg-surface-container-low px-6 py-section">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
              Signature best sellers
            </p>
            <h2 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
              Crowd favorites, every batch.
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden font-label text-sm uppercase tracking-[0.12em] text-primary hover:text-secondary md:inline"
          >
            View the whole shop →
          </Link>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {items.map(({ product, variant, imageUrl }) => (
            <Link key={product.id} href={`/shop/${product.slug}`} className="group block">
              <NibbleCard className="flex h-full flex-col">
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-secondary-container to-tertiary-fixed">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                    {variant?.label}
                  </p>
                  <h3 className="mt-2 font-headline text-xl font-bold text-primary">
                    {product.name}
                  </h3>
                  {product.shortDescription ? (
                    <p className="mt-1 text-sm text-tertiary">{product.shortDescription}</p>
                  ) : null}
                  <div className="mt-auto flex items-end justify-between pt-6">
                    <p className="font-headline text-2xl font-bold text-on-surface">
                      {formatCents(variant?.priceCents)}
                    </p>
                    <span className="font-label uppercase tracking-[0.12em] text-sm text-primary group-hover:text-secondary">
                      View →
                    </span>
                  </div>
                </div>
              </NibbleCard>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Next drop — pulls the soonest active drop or shows a notify CTA.
   --------------------------------------------------------------------------- */
function NextDropSection({ drop }: { drop: Awaited<ReturnType<typeof nextDrop>> }) {
  return (
    <section className="px-6 py-section">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-[5fr_6fr]">
        <NibbleCard className="aspect-[4/5] bg-gradient-to-br from-tertiary-fixed via-primary-fixed to-secondary-container" />
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            {drop
              ? phaseOf(drop) === "preorder"
                ? `Opens ${formatDate(drop.opensAt)}`
                : `Live until ${formatDate(drop.closesAt)}`
              : "Upcoming treat drops"}
          </p>
          <h2 className="mt-2 font-headline text-4xl font-extrabold leading-tight text-primary md:text-5xl">
            {drop ? drop.name : "A curated box for every moment — three to five cookies, one perfect bite each."}
          </h2>
          <p className="mt-6 max-w-xl text-tertiary">
            {drop?.cookieBox?.tagline ??
              "Each drop is limited. Grab the assorted box for a full tasting, or buy a dozen of your favorite. Once they're gone, they're gone."}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            {drop ? (
              <>
                <BiteButton href={`/drops/${drop.slug}`} size="lg">See the box</BiteButton>
                <BiteButton href="/drops/notify" variant="secondary" size="lg">
                  Notify me of the next one
                </BiteButton>
              </>
            ) : (
              <BiteButton href="/drops/notify" size="lg">
                Notify me about the next drop
              </BiteButton>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   About teaser
   --------------------------------------------------------------------------- */
function AboutTeaser() {
  return (
    <section className="bg-surface-container px-6 py-section">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Meet the heart behind the hearth
          </p>
          <h2 className="mt-2 font-headline text-4xl font-extrabold leading-tight text-primary md:text-5xl">
            Tess Elaine Smith — the baker, the boss, the whole &lsquo;TES&rsquo;.
          </h2>
          <p className="mt-6 text-tertiary">
            TES Treats is a one-woman home bakery. Tess does the recipe development, the late-night
            mixing, the boxing-up — all from her kitchen. If you have a custom request, she&rsquo;s
            the one who&rsquo;ll write back.
          </p>
          <div className="mt-8">
            <BiteButton href="/about" variant="secondary" size="lg">
              Read her story
            </BiteButton>
          </div>
        </div>
        <div className="relative md:justify-self-end">
          <NibbleCard className="aspect-[4/5] w-full max-w-md rotate-[-2deg] bg-gradient-to-br from-secondary-container to-primary-fixed-dim shadow-chocolate-lg" />
          <div
            className="absolute -bottom-8 -right-4 -z-0 aspect-square w-2/3 rotate-3 bg-secondary-container scalloped-bite"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Newsletter / Drop notification — uses the real subscribeAction.
   --------------------------------------------------------------------------- */
function NibblerListSection() {
  return (
    <section className="px-6 py-section">
      <NibbleCard bite="none" className="mx-auto max-w-5xl bg-primary px-8 py-16 text-on-primary md:px-16">
        <div className="grid items-center gap-8 md:grid-cols-[3fr_2fr]">
          <div>
            <h2 className="font-headline text-3xl font-bold uppercase tracking-tighter text-on-primary md:text-4xl">
              Join the secret nibbler list.
            </h2>
            <p className="mt-3 font-body text-on-primary">
              Get a heads-up before each treat drop goes live. No spam, just sweet news.
            </p>
          </div>
          <form action={subscribeAction} className="flex gap-2">
            <input type="hidden" name="source" value="homepage" />
            <label className="sr-only" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@kitchen-table.com"
              className="ghost-border flex-1 rounded-lg bg-surface-container-high px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant focus:bg-primary-fixed focus:outline-none"
            />
            <BiteButton size="md" variant="secondary">Subscribe</BiteButton>
          </form>
        </div>
      </NibbleCard>
    </section>
  );
}
