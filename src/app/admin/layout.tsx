import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { signOutAction } from "@/app/(site)/sign-in/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-surface md:flex-row">
      <aside className="bg-surface-container-high px-6 py-8 md:w-64 md:shrink-0">
        <Link
          href="/admin"
          className="font-headline text-2xl font-extrabold text-primary"
        >
          TES Admin
        </Link>
        <nav className="mt-8 space-y-1" aria-label="Admin">
          <NavItem href="/admin" label="Dashboard" />
          <NavItem href="/admin/custom-requests" label="Custom requests" />
          <NavItem href="/admin/cookie-boxes" label="Cookie Boxes" />
          <NavItem href="/admin/drops" label="Drops" />
          <NavItem href="/admin/products" label="Products" />
          <NavItem href="/admin/categories" label="Categories" />
          <NavItem href="/admin/orders" label="Orders" />
          <NavItem href="/admin/abandoned-carts" label="Abandoned Carts" />
          <NavItem href="/admin/subscribers" label="Subscribers" />
          <NavItem href="/admin/config" label="Site config" />
        </nav>
        <div className="mt-12 border-t border-outline-variant/15 pt-6">
          <p className="text-xs text-on-surface-variant">
            Signed in as <strong className="text-on-surface">{user.email}</strong>
          </p>
          <div className="mt-3 flex items-baseline gap-4 leading-tight">
            <Link
              href="/"
              className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
            >
              View site
            </Link>
            <form action={signOutAction} className="contents">
              <button
                type="submit"
                className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary hover:underline cursor-pointer"
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
