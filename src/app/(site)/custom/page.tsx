import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { auth } from "@/auth";
import { submitCustomRequestAction } from "./actions";
import { PhoneInput } from "./phone-input";

export const metadata = { title: "Custom requests" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  email: "Please enter a valid email so Tess can reach you.",
  description: "Tell Tess what you're dreaming up — the description is required.",
  upload: "One of your photos couldn't be uploaded. Try a smaller file (5MB max).",
};

export default async function CustomPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const { error, submitted } = await searchParams;
  const session = await auth();

  if (submitted) {
    return (
      <section className="px-6 py-section">
        <NibbleCard bite="none" className="mx-auto max-w-2xl p-10 text-center">
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Request received
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
            Tess will be in touch.
          </h1>
          <p className="mt-4 text-tertiary">
            She typically replies within 1–2 days with a quote. You&rsquo;ll get an email
            when she does — and a Stripe payment link to lock it in.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <BiteButton href="/" size="lg">Back to the bakery</BiteButton>
            {session?.user ? (
              <BiteButton href="/account/custom-requests" variant="secondary" size="lg">
                Track my requests
              </BiteButton>
            ) : null}
          </div>
        </NibbleCard>
      </section>
    );
  }

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-3xl">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Custom requests
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-6xl">
          Dreaming of something specific?
        </h1>
        <p className="mt-4 max-w-2xl text-tertiary">
          Themed cookie boxes, dessert tables, custom flavors — Tess takes on
          commissions when her schedule allows. Tell her what you&rsquo;re imagining
          (photos help!) and she&rsquo;ll come back with a quote.
        </p>

        {error && ERRORS[error] ? (
          <p className="mt-6 rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
            {ERRORS[error]}
          </p>
        ) : null}

        <NibbleCard bite="none" className="mt-10 p-6 md:p-10">
          <form action={submitCustomRequestAction} encType="multipart/form-data" className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                name="name"
                label="Your name"
                defaultValue={session?.user?.name ?? ""}
              />
              <Field
                name="email"
                type="email"
                label="Email"
                defaultValue={session?.user?.email ?? ""}
                required
              />
            </div>
            <PhoneInput />
            <Field name="occasion" label="Occasion (wedding, baby shower, just because…)" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="desiredDate" type="date" label="Desired date (optional)" />
              <Field name="servings" type="number" label="Approx. how many people?" />
            </div>
            <div>
              <label className="block">
                <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                  What are you dreaming of?
                </span>
                <textarea
                  name="description"
                  rows={6}
                  required
                  placeholder="Birthday, baby shower, just because..."
                  className="ghost-border mt-2 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant focus:bg-primary-fixed focus:outline-none"
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                  Reference photos (optional, up to 5)
                </span>
                <input
                  name="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="mt-2 block w-full font-body text-sm text-on-surface file:mr-3 file:rounded-md file:border-0 file:bg-secondary-container file:px-4 file:py-2 file:font-headline file:font-bold file:text-on-secondary-container hover:file:bg-secondary-fixed"
                />
              </label>
              <p className="mt-1 text-xs text-on-surface-variant">5MB per photo max.</p>
            </div>

            <BiteButton size="lg" className="w-full">
              Send my request
            </BiteButton>
            <p className="text-center text-xs text-on-surface-variant">
              Tess reads every request herself. By submitting you agree she may reply via email.
            </p>
          </form>
        </NibbleCard>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Looking for something on the catalog?{" "}
          <Link href="/shop" className="text-primary hover:underline">Shop the treats →</Link>
        </p>
      </div>
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={label}
        className="ghost-border w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
