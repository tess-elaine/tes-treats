import { redirect } from "next/navigation";
import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { auth } from "@/auth";
import { getCart } from "@/lib/cart";
import { db } from "@/db";
import { formatCents } from "@/lib/format";
import { startCheckoutAction } from "./actions";
import { isStripeLive } from "@/lib/stripe";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  email: "Please enter a valid email address.",
  address: "Please fill in the delivery address.",
  zone: "Sorry, that zip code isn't in Tess's delivery area yet — try pickup, or contact us.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cart = await getCart();
  if (cart.lines.length === 0) redirect("/cart");

  const session = await auth();
  const cfg = await db.query.siteConfig.findFirst();

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-headline text-4xl font-extrabold text-primary md:text-5xl">
          Checkout
        </h1>

        {error && ERRORS[error] ? (
          <p className="mt-6 rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
            {ERRORS[error]}
          </p>
        ) : null}

        <form action={startCheckoutAction} className="mt-10 grid gap-10 md:grid-cols-[3fr_2fr]">
          <div className="space-y-6">
            <NibbleCard bite="none" className="p-6 md:p-8">
              <h2 className="font-headline text-xl font-bold text-primary">
                Contact
              </h2>
              <div className="mt-4 grid gap-3">
                <Field
                  name="email"
                  type="email"
                  label="Email"
                  defaultValue={session?.user?.email ?? ""}
                  required
                />
                <Field name="phone" type="tel" label="Phone (optional, for pickup/delivery coordination)" />
              </div>
            </NibbleCard>

            <NibbleCard bite="none" className="p-6 md:p-8">
              <h2 className="font-headline text-xl font-bold text-primary">
                How would you like it?
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <FulfillmentOption
                  value="pickup"
                  label="Pickup"
                  detail={
                    cfg
                      ? `${cfg.bakeryAddress.line1}, ${cfg.bakeryAddress.city}`
                      : "TES Treats kitchen"
                  }
                  defaultChecked
                />
                <FulfillmentOption
                  value="delivery"
                  label="Local delivery"
                  detail="Tess hand-delivers in Buffalo"
                />
              </div>
              {cfg?.pickupInstructions ? (
                <p className="mt-4 text-sm text-on-surface-variant">
                  <span className="font-medium">Pickup:</span> {cfg.pickupInstructions}
                </p>
              ) : null}
            </NibbleCard>

            <NibbleCard bite="none" className="p-6 md:p-8">
              <h2 className="font-headline text-xl font-bold text-primary">
                Delivery address
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Skip if you&rsquo;re picking up.
              </p>
              <div className="mt-4 grid gap-3">
                <Field name="line1" label="Street address" />
                <Field name="line2" label="Apt / suite (optional)" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field name="city" label="City" defaultValue="Buffalo" />
                  <Field name="state" label="State" defaultValue="NY" />
                  <Field name="postalCode" label="ZIP" />
                </div>
                <Field name="addressNotes" label="Delivery notes (gate code, etc.)" />
              </div>
              {cfg?.deliveryZones?.length ? (
                <p className="mt-4 text-xs text-on-surface-variant">
                  Currently delivering to:{" "}
                  {cfg.deliveryZones
                    .map((z) => `${z.label} (${formatCents(z.feeCents)})`)
                    .join(", ")}
                  .
                </p>
              ) : null}
            </NibbleCard>

            <NibbleCard bite="none" className="p-6 md:p-8">
              <h2 className="font-headline text-xl font-bold text-primary">
                Anything else?
              </h2>
              <textarea
                name="customerNotes"
                rows={3}
                placeholder="Allergies, special requests, when you'd like it..."
                className="ghost-border mt-4 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant focus:bg-primary-fixed focus:outline-none"
              />
            </NibbleCard>
          </div>

          <NibbleCard bite="none" className="h-fit p-6 md:p-8">
            <h2 className="font-headline text-2xl font-bold text-primary">
              Order summary
            </h2>
            <ul className="mt-4 space-y-3">
              {cart.lines.map((l) => (
                <li key={l.lineId} className="flex justify-between text-sm">
                  <div className="pr-2">
                    <p className="font-medium text-on-surface">
                      {l.name}
                      {l.variantLabel ? ` · ${l.variantLabel}` : ""}
                    </p>
                    <p className="text-on-surface-variant">× {l.quantity}</p>
                  </div>
                  <p className="font-headline font-bold text-on-surface">
                    {formatCents(l.unitPriceCents * l.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-2 border-t border-outline-variant/15 pt-4">
              <Row label="Subtotal" value={formatCents(cart.subtotalCents)} />
              <Row label="Delivery" value="Calculated when you submit" muted />
            </dl>
            <p className="mt-4 text-xs text-on-surface-variant">
              Final total appears on the {isStripeLive() ? "Stripe checkout page" : "confirmation page"}.
            </p>
            <div className="mt-6">
              <BiteButton size="lg" className="w-full">
                {isStripeLive() ? "Continue to payment" : "Place order (dev)"}
              </BiteButton>
            </div>
            <p className="mt-3 text-center text-xs">
              <Link href="/cart" className="text-on-surface-variant hover:text-primary">← Back to cart</Link>
            </p>
          </NibbleCard>
        </form>
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

function FulfillmentOption({
  value,
  label,
  detail,
  defaultChecked,
}: {
  value: "pickup" | "delivery";
  label: string;
  detail: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer flex-col gap-1 rounded-md bg-surface-container-high p-4 transition-colors has-[:checked]:bg-primary-fixed">
      <input
        type="radio"
        name="fulfillment"
        value={value}
        defaultChecked={defaultChecked}
        className="hidden"
      />
      <span className="font-headline font-bold text-on-surface">{label}</span>
      <span className="text-sm text-on-surface-variant">{detail}</span>
    </label>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={muted ? "text-on-surface-variant text-sm" : "text-tertiary"}>{label}</dt>
      <dd className={muted ? "text-on-surface-variant text-sm" : "font-headline font-bold text-on-surface"}>{value}</dd>
    </div>
  );
}
