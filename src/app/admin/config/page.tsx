import { db } from "@/db";
import { SiteConfigClient } from "./SiteConfigClient";

export const metadata = { title: "Admin · Site config" };
export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const cfg = await db.query.siteConfig.findFirst();

  return (
    <div className="space-y-8">
      <header>
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          Configuration
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
          Site config
        </h1>
        <p className="mt-2 text-tertiary">
          Bakery address, delivery zones, and tax handling. Changes take effect immediately.
        </p>
      </header>

      <SiteConfigClient cfg={cfg} />
    </div>
  );
}
