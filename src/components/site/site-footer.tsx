import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="bg-surface-container-high mt-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <Wordmark size={96} />
          <p className="mt-4 max-w-sm text-on-surface-variant">
            Sugar, flour, and a little mixing power. Tess bakes every treat from scratch, and they always taste like they were made just for you.
          </p>
        </div>
        <FooterCol title="Shop" links={[
          { label: "All Treats", href: "/shop" },
          { label: "Treat Drops", href: "/drops" },
          { label: "Custom Requests", href: "/custom" },
        ]} />
        <FooterCol title="About" links={[
          { label: "Our Story", href: "/about" },
          { label: "Contact", href: "/contact" },
          { label: "Pickup & Delivery", href: "/pickup" },
        ]} />
      </div>
      <div className="border-t border-outline-variant/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-on-surface-variant md:flex-row">
          <p>© {new Date().getFullYear()} TES Treats</p>
          <p>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <span className="mx-2">·</span>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
        {title}
      </h3>
      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-on-surface transition-colors hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
