import { NibbleCard } from "@/components/ui/nibble-card";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <section className="px-6 py-section">
      <NibbleCard bite="tr" className="mx-auto max-w-3xl p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Privacy
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          What we keep, and don&rsquo;t.
        </h1>
        <div className="mt-6 space-y-4 text-on-surface">
          <p>
            TES Treats is a small bakery, not an ad network. Here&rsquo;s
            exactly what we do with your data.
          </p>
          <h2 className="mt-6 font-headline text-xl font-bold text-primary">
            What we collect
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Your name, email, and (for delivery) address &mdash; so we can
              fulfill your order and reach you about it.
            </li>
            <li>
              Order history, so you can see past orders in your account.
            </li>
            <li>
              Payment is handled by{" "}
              <a
                href="https://stripe.com/privacy"
                className="text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                Stripe
              </a>
              ; we never see or store your card details.
            </li>
          </ul>
          <h2 className="mt-6 font-headline text-xl font-bold text-primary">
            What we don&rsquo;t do
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Sell your data to anyone, ever.</li>
            <li>Run third-party ad trackers on the site.</li>
            <li>Email you marketing unless you opt in to a drop notification.</li>
          </ul>
          <p className="text-sm text-on-surface-variant">
            Want a copy of your data, or want it deleted? Email{" "}
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
