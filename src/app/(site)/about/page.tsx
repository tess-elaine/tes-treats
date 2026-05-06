import { NibbleCard } from "@/components/ui/nibble-card";

export const metadata = { title: "Our Story" };

export default function AboutPage() {
  return (
    <section className="px-6 py-section">
      <NibbleCard bite="tr" className="mx-auto max-w-3xl p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Our story
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          Hi, I&rsquo;m Tess.
        </h1>
        <div className="mt-6 space-y-4 text-on-surface">
          <p>
            TES Treats is a small home bakery out of Buffalo, NY. Everything is
            baked in small batches, by hand, the day you pick it up.
          </p>
          <p>
            I love a good cookie box, a holiday spread, and a custom order
            with a story behind it &mdash; birthdays, weddings, &ldquo;just
            because&rdquo; days. If you have an idea, send it over.
          </p>
        </div>
      </NibbleCard>
    </section>
  );
}
