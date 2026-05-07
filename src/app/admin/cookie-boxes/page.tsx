import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";

export const metadata = { title: "Admin · Cookie Boxes" };
export const dynamic = "force-dynamic";

export default async function AdminCookieBoxesPage() {
  const list = await db.query.cookieBoxes.findMany({
    orderBy: (t, { asc }) => [asc(t.createdAt)],
    with: { items: true, drops: true },
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Catalog
          </p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
            Cookie Boxes
          </h1>
          <p className="mt-2 text-tertiary">
            Create a box once, link it to a drop whenever you run it.
          </p>
        </div>
        <BiteButton href="/admin/cookie-boxes/new" size="md">+ New box</BiteButton>
      </header>

      {list.length === 0 ? (
        <NibbleCard bite="none" className="p-10 text-center">
          <p className="text-tertiary">No cookie boxes yet.</p>
        </NibbleCard>
      ) : (
        <NibbleCard bite="none" className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Name</Th>
                <Th>Cookies</Th>
                <Th>Drops</Th>
                <Th>Hidden</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((box) => (
                <tr key={box.id} className="border-t border-outline-variant/15">
                  <Td>
                    <Link
                      href={`/admin/cookie-boxes/${box.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {box.name}
                    </Link>
                    {box.tagline ? (
                      <p className="text-xs text-on-surface-variant">{box.tagline}</p>
                    ) : null}
                  </Td>
                  <Td>{box.items.length}</Td>
                  <Td>{box.drops.length}</Td>
                  <Td>{box.isHidden ? "Hidden" : "Visible"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </NibbleCard>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
