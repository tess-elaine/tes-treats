/**
 * Stripe client. Returns null when no key is configured so callers can branch
 * to a dev-mode short-circuit (lib/checkout.ts).
 *
 * Portability note: Stripe is provider-agnostic itself — it doesn't tie us
 * to any host. Just env vars. STRIPE_DISABLED=true forces the dev path even
 * when keys exist (useful for offline tests).
 */
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (process.env.STRIPE_DISABLED === "true") return null;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached) return cached;
  cached = new Stripe(key, {
    // Pin a known recent API version. Stripe maintains backwards-compat per
    // pinned version, so this only changes when we upgrade intentionally.
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
  return cached;
}

export function isStripeLive(): boolean {
  return getStripe() !== null;
}
