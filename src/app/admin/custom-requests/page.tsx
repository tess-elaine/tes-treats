import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { formatCents, formatDate } from "@/lib/format";

export const metadata = { title: "Admin · Custom requests" };
export const dynamic = "force-dynamic";

const STATUS_PILLS: Record<string, string> = {
  submitted: "bg-secondary-container text-on-secondary-container",
  reviewing: "bg-tertiary-fixed text-on-tertiary-fixed",
  needs_info: "bg-error-container text-on-error-container",
  quoted: "bg-primary-fixed text-on-primary-fixed",
  declined: "bg-surface-container-high text-on-surface-variant",
  paid: "bg-primary text-on-primary",
  in_kitchen: "bg-secondary-fixed text-on-secondary-fixed",
  fulfilled: "bg-surface-container-highest text-on-surface",
  cancelled: "bg-surface-container-high text-on-surface-variant",
};

export default async function AdminCustomRequestsPage() {
  const list = await db.query.customRequests.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Inbox
          </p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
            Custom requests
          </h1>
        </div>
      </header>

      {list.length === 0 ? (
        <NibbleCard bite="none" className="p-10 text-center">
          <p className="text-tertiary">No custom requests yet.</p>
        </NibbleCard>
      ) : (
        <NibbleCard bite="none" className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
                <Th>Number</Th>
                <Th>Customer</Th>
                <Th>Occasion</Th>
                <Th>Received</Th>
                <Th>Quote</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-outline-variant/15">
                  <Td>
                    <Link href={`/admin/custom-requests/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.number}
                    </Link>
                  </Td>
                  <Td>
                    <div>
                      <p className="font-medium text-on-surface">{r.name ?? "—"}</p>
                      <p className="text-xs text-on-surface-variant">{r.email}</p>
                    </div>
                  </Td>
                  <Td>{r.occasion ?? "—"}</Td>
                  <Td>{formatDate(r.createdAt)}</Td>
                  <Td>{r.quoteCents != null ? formatCents(r.quoteCents) : "—"}</Td>
                  <Td>
                    <span className={`inline-block rounded-full px-2 py-1 font-label text-xs uppercase tracking-[0.12em] ${STATUS_PILLS[r.status] ?? ""}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </Td>
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
  return <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em]">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
