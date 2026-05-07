"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { signUpWithPassword } from "@/app/(site)/sign-in/actions";

const initial: { error?: string } = {};

export default function SignUpForm() {
  const search = useSearchParams();
  const next = search.get("next") ?? "/";
  const [state, action, pending] = useActionState(signUpWithPassword, initial);

  return (
    <section className="px-6 py-section">
      <NibbleCard bite="none" className="mx-auto max-w-md p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          New here? Welcome.
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          Create your account.
        </h1>
        <p className="mt-3 text-tertiary">
          One account works for catalog orders, treat drops, and custom requests.
        </p>

        {state.error ? (
          <p className="mt-6 rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
            {state.error}
          </p>
        ) : null}

        <form action={action} className="mt-8 space-y-3">
          <input type="hidden" name="next" value={next} />
          <Field name="name" label="Your name" autoComplete="name" />
          <Field name="email" type="email" label="Email" autoComplete="email" required />
          <Field name="password" type="password" label="Password (8+ characters)" autoComplete="new-password" required />
          <BiteButton size="lg" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create account"}
          </BiteButton>
        </form>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link
            href={`/sign-in${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </NibbleCard>
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={label}
        className="ghost-border w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
