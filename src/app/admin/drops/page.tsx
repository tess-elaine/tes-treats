import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "Admin · Drops" };
export const dynamic = "force-dynamic";

export default async function AdminDropsPage() {
  const list = await db.query.drops.findMany({
    orderBy: (t, { desc }) => [desc(t.opensAt)],
    with: { cookieBox: { columns: { name: true } } },
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Treat drops
          </p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
            Drops
          </h1>
        </div>
        <BiteButton href="/admin/drops/new" size="md">+ New drop</BiteButton>
      </header>

      {list.length === 0 ? (
        <NibbleCard bite="none" className="p-10 text-center">
          <p className="text-tertiary">No drops scheduled yet.</p>
        </NibbleCard>
      ) : (
        <NibbleCard bite="none" className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Name</Th>
                <Th>Box</Th>
                <Th>Opens</Th>
                <Th>Closes</Th>
                <Th>Box price</Th>
                <Th>Inventory</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className="border-t border-outline-variant/15">
                  <Td>
                    <Link
                      href={`/admin/drops/${d.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {d.name}
                    </Link>
                  </Td>
                  <Td>
                    {d.cookieBox ? (
                      <span className="text-sm text-on-surface-variant">{d.cookieBox.name}</span>
                    ) : (
                      <span className="text-sm text-on-surface-variant/50">—</span>
                    )}
                  </Td>
                  <Td>{formatDate(d.opensAt)}</Td>
                  <Td>{formatDate(d.closesAt)}</Td>
                  <Td>{formatCents(d.assortedBoxPriceCents)}</Td>
                  <Td>
                    {d.assortedBoxInventory == null
                      ? "Unlimited"
                      : `${d.assortedBoxSold}/${d.assortedBoxInventory}`}
                  </Td>
                  <Td>{d.isPublished ? "Published" : "Draft"}</Td>
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
