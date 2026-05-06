import { NibbleCard } from "@/components/ui/nibble-card";

export const metadata = { title: "Pickup & Delivery" };

export default function PickupPage() {
  return (
    <section className="px-6 py-section">
      <NibbleCard bite="br" className="mx-auto max-w-3xl p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Pickup &amp; delivery
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          How to get your order.
        </h1>
        <div className="mt-6 space-y-4 text-on-surface">
          <p>
            <strong>Pickup</strong> is from my home kitchen in Buffalo, NY. The
            exact address is shared in your order confirmation email so it stays
            off the public site.
          </p>
          <p>
            <strong>Local delivery</strong> is available within a few miles of
            the bakery for an added fee &mdash; you&rsquo;ll see the option at
            checkout if your zip qualifies.
          </p>
          <p>
            <strong>Shipping</strong> isn&rsquo;t supported right now; I&rsquo;d
            rather you eat the cookies fresh than mailed.
          </p>
        </div>
      </NibbleCard>
    </section>
  );
}
