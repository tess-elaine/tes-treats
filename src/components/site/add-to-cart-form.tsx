"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { useActionState } from "react";
import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { addToCartStateAction } from "@/app/(site)/cart/actions";

export function AddToCartForm({
  itemName,
  className,
  children,
}: {
  itemName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(addToCartStateAction, null);
  const [modalOpen, setModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (state?.ok) setModalOpen(true);
  }, [state]);

  React.useEffect(() => {
    if (!modalOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  return (
    <>
      <form action={formAction} className={className}>
        <fieldset disabled={isPending} style={{ all: "unset", display: "contents" }}>
          {children}
        </fieldset>
      </form>

      {modalOpen &&
        ReactDOM.createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Added to cart"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-on-surface/40"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-surface-container-lowest px-8 py-8 shadow-chocolate">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                  aria-hidden
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-center font-headline text-2xl font-extrabold text-primary">
                Added to your cart!
              </h2>
              {itemName ? (
                <p className="mt-2 text-center font-body text-on-surface-variant">
                  {itemName}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-3">
                <BiteButton
                  href="/checkout"
                  size="lg"
                  className="w-full"
                  biteColor="var(--color-surface-container-lowest)"
                >
                  Go to checkout
                </BiteButton>
                <BiteButton
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  biteColor="var(--color-surface-container-lowest)"
                  onClick={() => setModalOpen(false)}
                >
                  Keep shopping
                </BiteButton>
              </div>
              <p className="mt-4 text-center">
                <Link
                  href="/cart"
                  onClick={() => setModalOpen(false)}
                  className="text-sm text-on-surface-variant underline-offset-2 hover:text-primary hover:underline"
                >
                  View cart →
                </Link>
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
