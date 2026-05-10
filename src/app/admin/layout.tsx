import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { signOutAction } from "@/app/(site)/sign-in/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-surface md:flex-row">
      <aside className="flex flex-col bg-surface-container-high px-6 pt-8 pb-0 md:w-64 md:shrink-0 md:min-h-screen">
        <div className="flex-1">
          <Link
            href="/admin"
            className="font-headline text-2xl font-extrabold text-primary"
          >
            TES Admin
          </Link>
          <nav className="mt-8 space-y-4" aria-label="Admin">
            <NavGroup label="Orders & Fulfillment">
              <NavItem href="/admin" label="Dashboard" />
              <NavItem href="/admin/orders" label="Orders" />
              <NavItem href="/admin/custom-requests" label="Custom requests" />
            </NavGroup>
            <NavGroup label="Products & Listings">
              <NavItem href="/admin/products" label="Products" />
              <NavItem href="/admin/categories" label="Categories" />
              <NavItem href="/admin/cookie-boxes" label="Cookie Boxes" />
              <NavItem href="/admin/drops" label="Drops" />
            </NavGroup>
            <NavGroup label="Kitchen">
              <NavItem href="/admin/cookbook" label="Cookbook" />
              <NavItem href="/admin/ingredients" label="Ingredients" />
              <NavItem href="/admin/prep" label="Prep sheet" />
            </NavGroup>
            <NavGroup label="Marketing">
              <NavItem href="/admin/subscribers" label="Subscribers" />
              <NavItem href="/admin/abandoned-carts" label="Abandoned Carts" />
            </NavGroup>
          </nav>
        </div>

        {/* Footer box — bleeds to sidebar edges, rounded top only */}
        <div className="-mx-6 mt-6 rounded-t-xl bg-surface-container-highest px-6 py-5">
          <p className="truncate text-xs text-on-surface-variant">
            Signed in as <strong className="text-on-surface">{user.email}</strong>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/admin/config"
              aria-label="Site settings"
              title="Site settings"
              className="text-on-surface-variant transition-colors hover:text-primary"
            >
              <CogIcon />
            </Link>
            <Link
              href="/"
              className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
            >
              View site
            </Link>
            <form action={signOutAction} className="contents">
              <button
                type="submit"
                className="cursor-pointer font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 px-6 py-10 md:px-10">{children}</main>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-3 font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/50">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 font-headline text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-highest hover:text-primary"
    >
      {label}
    </Link>
  );
}

function CogIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
