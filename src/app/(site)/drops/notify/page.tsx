import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { subscribeAction } from "./actions";

export const metadata = { title: "Notify me about the next drop" };

export default async function NotifyMePage({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string; error?: string }>;
}) {
  const { subscribed, error } = await searchParams;

  if (subscribed) {
    return (
      <section className="px-6 py-section">
        <NibbleCard bite="none" className="mx-auto max-w-md p-8 md:p-12 text-center">
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            You&rsquo;re on the list.
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
            We&rsquo;ll save you a box.
          </h1>
          <p className="mt-4 text-tertiary">
            Tess will email you the moment the next treat drop opens for orders.
          </p>
          <div className="mt-8">
            <BiteButton href="/" size="lg">Back to the bakery</BiteButton>
          </div>
        </NibbleCard>
      </section>
    );
  }

  return (
    <section className="px-6 py-section">
      <NibbleCard bite="none" className="mx-auto max-w-md p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          The Secret Nibbler List
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          Get a heads-up before each drop.
        </h1>
        <p className="mt-3 text-tertiary">
          One email per drop. No spam. Unsubscribe whenever.
        </p>

        {error ? (
          <p className="mt-6 rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
            That didn&rsquo;t look right — please check your email and try again.
          </p>
        ) : null}

        <form action={subscribeAction} className="mt-8 space-y-3">
          <input type="hidden" name="source" value="drops-notify-page" />
          <label className="block">
            <span className="sr-only">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@kitchen-table.com"
              className="ghost-border w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant focus:bg-primary-fixed focus:outline-none"
            />
          </label>
          <BiteButton size="lg" className="w-full">
            Notify me about the next drop
          </BiteButton>
        </form>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          <Link href="/drops" className="hover:text-primary">← See current drops</Link>
        </p>
      </NibbleCard>
    </section>
  );
}
