import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";

export const metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <section className="px-6 py-section">
      <NibbleCard className="mx-auto max-w-md p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Almost there
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          Check your inbox.
        </h1>
        <p className="mt-4 text-tertiary">
          We just sent you a sign-in link. Click it within the next hour to come
          straight back here, signed in.
        </p>
        <p className="mt-6 text-sm text-on-surface-variant">
          Didn&rsquo;t get anything? Check your spam folder, or{" "}
          <Link href="/sign-in" className="text-primary underline">
            try again
          </Link>
          .
        </p>
      </NibbleCard>
    </section>
  );
}
