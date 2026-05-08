import Link from "next/link";
import Image from "next/image";
import { Wordmark } from "./wordmark";
import { HeaderAccountMenu } from "./header-account-menu";
import { MobileNav } from "./mobile-nav";
import { getCartCount } from "@/lib/cart";

const NAV: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Treat Drops", href: "/drops" },
  { label: "Custom Requests", href: "/custom" },
  { label: "Our Story", href: "/about" },
];

// Desktop suppresses the redundant Home link (the centered logo already
// goes home). Mobile keeps it because the drawer hides the logo.
const DESKTOP_NAV = NAV.filter((n) => n.href !== "/");

export async function SiteHeader() {
  const cartCount = await getCartCount();

  return (
    <header className="glass-nav sticky top-0 z-50 shadow-chocolate">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Mobile (sm-and-down): 3-zone grid — hamburger | logo | account+cart */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 md:hidden">
          <MobileNav items={NAV} />
          <div className="flex justify-center">
            <NavLogo />
          </div>
          <div className="flex items-center gap-2">
            <HeaderAccountMenu />
            <CartLink count={cartCount} />
          </div>
        </div>

        {/* Desktop (md+): logo left, nav center-ish, account+cart right */}
        <div className="hidden items-center justify-between gap-6 py-3 md:flex">
          <NavLogo />
          <nav className="flex items-center gap-8" aria-label="Primary">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-label text-sm uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <HeaderAccountMenu />
            <CartLink count={cartCount} />
          </div>
        </div>
      </div>
    </header>
  );
}

function CartLink({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={`Cart (${count} ${count === 1 ? "item" : "items"})`}
      className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
    >
      <BagIcon />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-label text-[0.6875rem] font-bold text-on-primary"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function NavLogo() {
  return (
    <Link href="/" aria-label="TES Treats — home" className="inline-flex items-center transition-opacity hover:opacity-90">
      <Image src="/brand/tes-nav-logo.svg" alt="TES Treats" width={154} height={40} priority style={{ height: 40, width: "auto" }} className="py-1" />
    </Link>
  );
}

function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}
