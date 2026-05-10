"use client";

import * as React from "react";
import { useActionState } from "react";
import { BiteButton } from "@/components/ui/bite-button";
import { addToCartStateAction } from "@/app/(site)/cart/actions";

export function QuickAddButton({
  variantId,
  productName,
  biteColor,
  className,
}: {
  variantId: string;
  productName: string;
  biteColor?: string;
  className?: string;
}) {
  const [state, formAction, isPending] = useActionState(addToCartStateAction, null);
  const [justAdded, setJustAdded] = React.useState(false);

  React.useEffect(() => {
    if (state?.ok) {
      setJustAdded(true);
      const t = setTimeout(() => setJustAdded(false), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} onClick={(e) => e.stopPropagation()} className={className}>
      <input type="hidden" name="kind" value="variant" />
      <input type="hidden" name="productVariantId" value={variantId} />
      <input type="hidden" name="quantity" value="1" />
      <BiteButton
        type="submit"
        size="md"
        variant="primary"
        biteColor={biteColor}
        disabled={isPending}
        aria-label={`Add ${productName} to cart`}
        className="whitespace-nowrap py-2 px-4 text-sm"
      >
        {justAdded ? "✓ Added!" : isPending ? "Adding…" : "Add to cart"}
      </BiteButton>
    </form>
  );
}
