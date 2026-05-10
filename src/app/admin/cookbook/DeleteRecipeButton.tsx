"use client";

import { useTransition } from "react";
import { BiteButton } from "@/components/ui/bite-button";
import { deleteRecipeAction } from "./actions";

export function DeleteRecipeButton({
  recipeId,
  productId,
  recipeName,
}: {
  recipeId: string;
  productId: string;
  recipeName: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <BiteButton
      type="button"
      size="md"
      variant="ghost"
      className="text-on-error-container hover:text-on-error-container"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete "${recipeName}"? This cannot be undone.`)) return;
        startTransition(async () => {
          await deleteRecipeAction(recipeId, productId);
        });
      }}
    >
      {isPending ? "Deleting…" : "Delete"}
    </BiteButton>
  );
}
