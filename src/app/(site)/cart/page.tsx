import Link from "next/link";
import Image from "next/image";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { getCart } from "@/lib/cart";
import { formatCents } from "@/lib/format";
import {
  removeLineAction,
  updateQuantityAction,
} from "./actions";

export const metadata = { title: "Your cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart();

  return (
    <section className="px-6 py-section">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-headline text-4xl font-extrabold text-primary md:text-5xl">
          Your cart
        </h1>

        {cart.lines.length === 0 ? (
          <NibbleCard bite="none" className="mt-10 p-10 text-center">
            <p className="text-tertiary">Your cart is empty — for now.</p>
            <div className="mt-6">
              <BiteButton href="/shop" size="lg">Shop the treats</BiteButton>
            </div>
          </NibbleCard>
        ) : (
          <div className="mt-10 grid gap-10 md:grid-cols-[3fr_2fr]">
            <ul className="space-y-4">
              {cart.lines.map((line) => (
                <NibbleCard key={line.lineId} bite="none" className="flex gap-4 p-4">
                  <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg bg-secondary-container">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt={line.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-headline text-lg font-bold text-primary">
                          {line.name}
                        </p>
                        {line.variantLabel ? (
                          <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                            {line.variantLabel}
                          </p>
                        ) : null}
                      </div>
                      <p className="font-headline text-lg font-bold text-on-surface">
                        {formatCents(line.unitPriceCents * line.quantity)}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <form action={updateQuantityAction} className="flex items-center gap-2">
                        <input type="hidden" name="lineId" value={line.lineId} />
                        <label className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant" htmlFor={`qty-${line.lineId}`}>Qty</label>
                        <input
                          id={`qty-${line.lineId}`}
                          name="quantity"
                          type="number"
                          min={1}
                          max={99}
                          defaultValue={line.quantity}
                          className="ghost-border w-16 rounded-md bg-surface-container-high px-2 py-1 text-center font-body"
                        />
                        <button
                          type="submit"
                          className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                        >
                          Update
                        </button>
                      </form>
                      <form action={removeLineAction}>
                        <input type="hidden" name="lineId" value={line.lineId} />
                        <button
                          type="submit"
                          className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-error"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                </NibbleCard>
              ))}
            </ul>

            <NibbleCard bite="none" className="h-fit p-6 md:p-8">
              <h2 className="font-headline text-2xl font-bold text-primary">
                Summary
              </h2>
              <dl className="mt-4 space-y-2 text-on-surface">
                <div className="flex justify-between">
                  <dt className="text-tertiary">Subtotal ({cart.itemCount})</dt>
                  <dd className="font-headline font-bold">{formatCents(cart.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between text-sm text-on-surface-variant">
                  <dt>Delivery</dt>
                  <dd>Calculated at checkout</dd>
                </div>
              </dl>
              <div className="mt-6">
                <BiteButton href="/checkout" size="lg" className="w-full">
                  Continue to checkout
                </BiteButton>
              </div>
              <p className="mt-4 text-center text-xs text-on-surface-variant">
                <Link href="/shop" className="hover:text-primary">Keep shopping →</Link>
              </p>
            </NibbleCard>
          </div>
        )}
      </div>
    </section>
  );
}
