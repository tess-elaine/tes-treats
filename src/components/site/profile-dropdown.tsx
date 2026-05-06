"use client";

import * as React from "react";
import Link from "next/link";
import { signOutAction } from "@/app/(site)/sign-in/actions";

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: "customer" | "admin";
  };
};

export function ProfileDropdown({ user }: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click + escape.
  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = (user.name ?? user.email ?? "?")
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((s) => !s)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container font-headline font-bold text-sm transition-colors hover:bg-secondary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          initials || "?"
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 origin-top-right scalloped-bite-sm rounded-lg bg-surface-container-lowest shadow-chocolate-lg"
        >
          <div className="px-5 py-4">
            <p className="font-label uppercase tracking-[0.12em] text-on-surface-variant text-xs">
              Signed in as
            </p>
            <p className="mt-1 font-headline font-bold text-on-surface truncate">
              {user.name ?? user.email ?? "You"}
            </p>
            {user.name && user.email ? (
              <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
            ) : null}
          </div>
          <div className="bg-surface-container-low h-px" aria-hidden />
          <ul className="py-2" role="none">
            <Item href="/account" onSelect={() => setOpen(false)}>My account</Item>
            <Item href="/account/orders" onSelect={() => setOpen(false)}>Orders</Item>
            <Item href="/account/custom-requests" onSelect={() => setOpen(false)}>Custom requests</Item>
            {user.role === "admin" ? (
              <>
                <li role="none" className="my-1 mx-5 h-px bg-surface-container-low" aria-hidden />
                <Item href="/admin" onSelect={() => setOpen(false)} accent>
                  Admin dashboard
                </Item>
              </>
            ) : null}
          </ul>
          <div className="bg-surface-container-low h-px" aria-hidden />
          <form action={signOutAction} className="px-5 py-3">
            <button
              type="submit"
              className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Item({
  href,
  children,
  accent,
  onSelect,
}: {
  href: string;
  children: React.ReactNode;
  accent?: boolean;
  onSelect?: () => void;
}) {
  return (
    <li role="none">
      <Link
        href={href}
        role="menuitem"
        onClick={onSelect}
        className={`block px-5 py-2 text-sm transition-colors hover:bg-surface-container-low ${
          accent ? "text-primary font-medium" : "text-on-surface"
        }`}
      >
        {children}
      </Link>
    </li>
  );
}
