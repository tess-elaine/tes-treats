import { NibbleCard } from "@/components/ui/nibble-card";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <section className="px-6 py-section">
      <NibbleCard bite="bl" className="mx-auto max-w-3xl p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Terms
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          The fine print.
        </h1>
        <div className="mt-6 space-y-4 text-on-surface">
          <p>
            By placing an order with TES Treats you agree to the points below.
            They&rsquo;re short on purpose.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Orders are confirmed when payment goes through. If a treat drop
              sells out, anything else in your cart is still honored.
            </li>
            <li>
              Treats are made in a home kitchen that handles wheat, eggs,
              dairy, nuts, and soy. If you have an allergy, mention it when you
              order so we can talk through it.
            </li>
            <li>
              Custom orders are non-refundable once baking has started.
              Cancellations more than 48 hours out are fully refunded.
            </li>
            <li>
              Photos of finished orders may be shared on TES Treats&rsquo;
              social media unless you ask me not to.
            </li>
          </ul>
          <p className="text-sm text-on-surface-variant">
            Questions? Email{" "}
            <a
              href="mailto:tess@testreats.com"
              className="text-primary underline"
            >
              tess@testreats.com
            </a>
            .
          </p>
        </div>
      </NibbleCard>
    </section>
  );
}
