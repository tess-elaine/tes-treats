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
          <button
            type="submit"
            className="ghost-border flex w-full items-center justify-center gap-3 rounded-lg bg-white px-6 py-3 font-body text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <GoogleMark />
            <span>Continue with Google</span>
          </button>
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
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
