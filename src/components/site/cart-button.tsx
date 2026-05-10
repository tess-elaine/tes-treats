"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getCartAction } from "@/app/(site)/cart/actions";
import { BiteButton } from "@/components/ui/bite-button";
import { formatCents } from "@/lib/format";
import type { Cart } from "@/lib/cart";

export function CartButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function handleToggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      setCart(await getCartAction());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        aria-label={`Cart (${count} ${count === 1 ? "item" : "items"})`}
        className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
      >
        <CartIcon />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-label text-[0.6875rem] font-bold text-on-primary"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-chocolate-lg md:w-80">
          <div className="bg-surface-container-low px-4 py-3">
            <p className="font-headline text-base font-bold text-primary">Your Cart</p>
          </div>

          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-tertiary">Loading…</div>
          ) : !cart || cart.lines.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-tertiary">Your cart is empty.</p>
            </div>
          ) : (
            <ul className="max-h-60 divide-y divide-surface-container-low overflow-y-auto">
              {cart.lines.map((line) => (
                <li key={line.lineId} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-surface-container">
                    {line.imageUrl ? (
                      <Image src={line.imageUrl} alt={line.name} width={48} height={48} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">{line.name}</p>
                    {line.variantLabel && (
                      <p className="text-xs text-tertiary">{line.variantLabel}</p>
                    )}
                    <p className="text-xs text-tertiary">Qty {line.quantity}</p>
                  </div>
                  <p className="whitespace-nowrap font-label text-sm font-bold text-primary">
                    {formatCents(line.unitPriceCents * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {cart && cart.lines.length > 0 && (
            <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-on-surface-variant">Subtotal</p>
              <p className="font-label font-bold text-primary">{formatCents(cart.subtotalCents)}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 px-4 py-4">
            <BiteButton href="/checkout" size="md" biteColor="var(--color-surface-container-lowest)" onClick={() => setOpen(false)}>
              Checkout
            </BiteButton>
            <BiteButton href="/cart" size="md" variant="secondary" biteColor="var(--color-surface-container-lowest)" onClick={() => setOpen(false)}>
              View Cart
            </BiteButton>
          </div>
        </div>
      )}
    </div>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
