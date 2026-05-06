import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import {
  signInWithEmailMagicLink,
  signInWithGoogle,
  signInWithPassword,
} from "./actions";

export const metadata = { title: "Sign in" };

type Search = { next?: string; error?: string };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { next = "/", error } = await searchParams;

  return (
    <section className="px-6 py-section">
      <NibbleCard bite="none" className="mx-auto max-w-md p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Welcome to TES Treats
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          Sign in to keep nibbling.
        </h1>
        <p className="mt-3 text-tertiary">
          Track orders, save favorites, follow custom requests.
        </p>

        {error ? (
          <p className="mt-6 rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
            Sorry, that didn&rsquo;t work. Please try again.
          </p>
        ) : null}

        <form
          action={async () => {
            "use server";
            await signInWithGoogle(next);
          }}
          className="mt-8"
        >
          <BiteButton size="lg" className="w-full">
            <GoogleMark /> Continue with Google
          </BiteButton>
        </form>

        <Divider>or</Divider>

        <form action={signInWithPassword} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <Field name="email" type="email" label="Email" autoComplete="email" required />
          <Field name="password" type="password" label="Password" autoComplete="current-password" required />
          <BiteButton size="lg" variant="secondary" className="w-full">
            Sign in with password
          </BiteButton>
        </form>

        <Divider>or get a one-time link</Divider>

        <form action={signInWithEmailMagicLink} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <Field name="email" type="email" label="Email" autoComplete="email" required />
          <BiteButton size="lg" variant="ghost" className="w-full">
            Email me a sign-in link
          </BiteButton>
        </form>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          New here?{" "}
          <Link
            href={`/sign-up${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </NibbleCard>
    </section>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <p className="my-6 text-center font-label uppercase tracking-[0.12em] text-on-surface-variant">
      {children}
    </p>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  autoComplete,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder={label}
        className="ghost-border w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#fff" d="M21.35 11.1H12v3.83h5.36c-.23 1.5-1.7 4.4-5.36 4.4-3.23 0-5.86-2.66-5.86-5.94S8.77 7.45 12 7.45c1.84 0 3.07.78 3.78 1.45l2.58-2.5C16.7 4.83 14.55 4 12 4 7.03 4 3 8.03 3 13s4.03 9 9 9c5.2 0 8.65-3.65 8.65-8.78 0-.6-.07-1.07-.16-1.5Z"/>
    </svg>
  );
}
