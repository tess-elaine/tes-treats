"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
    >
      Print ↗
    </button>
  );
}
