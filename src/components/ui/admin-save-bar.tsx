"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { BiteButton } from "@/components/ui/bite-button";

export type SaveStatus = "idle" | "saved" | "error";

/**
 * Global save/discard bar that renders via a portal into <body>, pinned
 * to the bottom of the viewport. Use this on every admin edit page.
 * Accounts for the 256px sidebar with md:left-64.
 *
 * Render a <div className="h-20" /> spacer sibling whenever showBar is true
 * so page content isn't hidden behind the fixed bar.
 */
export function AdminSaveBar({
  changeCount,
  saveStatus,
  isPending,
  onSave,
  onDiscard,
}: {
  changeCount: number;
  saveStatus: SaveStatus;
  isPending: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showBar = changeCount > 0 || saveStatus !== "idle";
  if (!mounted || !showBar) return null;

  return createPortal(
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-between gap-4 border-t border-outline-variant bg-surface-container px-6 py-4 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] md:left-64">
      <span className="font-label text-sm text-on-surface">
        {saveStatus === "saved"
          ? "All changes saved."
          : saveStatus === "error"
          ? "Save failed — please try again."
          : `${changeCount} unsaved ${changeCount === 1 ? "change" : "changes"}`}
      </span>
      {changeCount > 0 && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isPending}
            className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-40"
          >
            Discard
          </button>
          <BiteButton
            size="md"
            type="button"
            onClick={onSave}
            disabled={isPending}
            biteColor="var(--color-surface-container)"
          >
            {isPending ? "Saving…" : "Save"}
          </BiteButton>
        </div>
      )}
    </div>,
    document.body
  );
}
