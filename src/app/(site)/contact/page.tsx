import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="px-6 py-section">
      <NibbleCard bite="tl" className="mx-auto max-w-2xl p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Contact
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          Get in touch.
        </h1>
        <div className="mt-6 space-y-4 text-on-surface">
          <p>
            For questions about an order or pickup, email{" "}
            <a
              href="mailto:tess@testreats.com"
              className="text-primary underline"
            >
              tess@testreats.com
            </a>
            .
          </p>
          <p>
            Looking for something custom &mdash; birthday, wedding,
            corporate? Use the{" "}
            <Link href="/custom" className="text-primary underline">
              custom request form
            </Link>{" "}
            so I have all the details in one place.
          </p>
        </div>
      </NibbleCard>
    </section>
  );
}
