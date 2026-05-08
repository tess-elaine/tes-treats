"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import Link from "next/link";

type NavItem = { label: string; href: string };

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = React.useState(false);

  // Lock body scroll while drawer is open + close on Escape.
  // Uses position:fixed approach instead of overflow:hidden — iOS Safari
  // breaks fixed overlays when overflow:hidden is set on body.
  React.useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
        className="-ml-1 flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary md:hidden"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {open && typeof document !== "undefined"
        ? ReactDOM.createPortal(
            <div
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              className="fixed inset-0 z-[9999] flex"
            >
              {/* Scrim */}
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-on-surface/50"
              />
              {/* Drawer */}
              <aside className="relative ml-0 flex h-full w-full max-w-sm flex-col bg-surface shadow-chocolate-lg">
                <div className="flex items-center justify-between px-6 py-4">
                  <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant text-xs">
                    Menu
                  </p>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="6" y1="18" x2="18" y2="6" />
                    </svg>
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Primary">
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-4 py-3 font-headline text-lg font-bold text-on-surface transition-colors hover:bg-surface-container-low hover:text-primary"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
