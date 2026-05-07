import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { activeDrops, pastDrops, phaseOf } from "@/lib/drops";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "Treat drops" };
export const dynamic = "force-dynamic";

export default async function DropsPage() {
  const [active, past] = await Promise.all([activeDrops(), pastDrops()]);

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-6xl">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Limited treat drops
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-6xl">
          A box for every moment.
        </h1>
        <p className="mt-4 max-w-2xl text-tertiary">
          Three to five cookies, baked together for one weekend only. Buy the assorted box, or grab
          a dozen of just your favorite — each drop sells out and disappears.
        </p>

        {active.length === 0 ? (
          <NibbleCard className="mt-12 p-10 text-center">
            <p className="text-tertiary">
              No drops live right now — but the next one is around the corner.
            </p>
            <div className="mt-6">
              <BiteButton href="/drops/notify" size="lg">
                Notify me about the next drop
              </BiteButton>
            </div>
          </NibbleCard>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {active.map((d) => {
              const phase = phaseOf(d);
              return (
                <Link key={d.id} href={`/drops/${d.slug}`} className="group block">
                  <NibbleCard className="flex h-full flex-col">
                    <div className="aspect-[5/3] bg-gradient-to-br from-secondary-container via-primary-fixed to-tertiary-fixed" />
                    <div className="flex flex-1 flex-col p-6 md:p-8">
                      <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                        {phase === "preorder"
                          ? `Opens ${formatDate(d.opensAt)}`
                          : phase === "open"
                            ? `Closes ${formatDate(d.closesAt)}`
                            : "Closed"}
                      </p>
                      <h2 className="mt-2 font-headline text-2xl font-bold text-primary">
                        {d.name}
                      </h2>
                      {d.cookieBox?.tagline ? (
                        <p className="mt-2 text-tertiary">{d.cookieBox.tagline}</p>
                      ) : null}
                      <div className="mt-auto flex items-end justify-between pt-6">
                        <p className="font-headline text-2xl font-bold text-on-surface">
                          {d.assortedBoxPriceCents
                            ? formatCents(d.assortedBoxPriceCents)
                            : "By the dozen"}
                        </p>
                        <span className="font-label uppercase tracking-[0.12em] text-sm text-primary group-hover:text-secondary">
                          See box →
                        </span>
                      </div>
                    </div>
                  </NibbleCard>
                </Link>
              );
            })}
          </div>
        )}

        {/* Past drops archive */}
        {past.length > 0 ? (
          <div className="mt-24">
            <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
              Past drops
            </p>
            <h2 className="mt-2 font-headline text-3xl font-extrabold text-primary">
              The archive
            </h2>
            <p className="mt-2 text-tertiary">
              These boxes are closed, but they&rsquo;ll be back.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {past.map((d) => (
                <Link key={d.id} href={`/drops/${d.slug}`} className="group block">
                  <NibbleCard className="flex h-full flex-col opacity-75 transition-opacity group-hover:opacity-100">
                    <div className="aspect-[5/3] bg-gradient-to-br from-surface-container-low to-surface-container" />
                    <div className="flex flex-1 flex-col p-6">
                      <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                        Closed · {formatDate(d.closesAt, { month: "long", year: "numeric" })}
                      </p>
                      <h3 className="mt-2 font-headline text-xl font-bold text-primary">
                        {d.name}
                      </h3>
                      {d.cookieBox?.tagline ? (
                        <p className="mt-1 text-sm text-tertiary">{d.cookieBox.tagline}</p>
                      ) : null}
                      <p className="mt-auto pt-4 font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant group-hover:text-primary">
                        View →
                      </p>
                    </div>
                  </NibbleCard>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
