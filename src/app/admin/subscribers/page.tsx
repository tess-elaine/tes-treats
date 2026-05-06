import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Admin · Subscribers" };
export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  const list = await db.query.dropSubscribers.findMany({
    orderBy: (t, { desc }) => [desc(t.subscribedAt)],
  });
  const active = list.filter((s) => !s.unsubscribedAt);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Mailing list
          </p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
            Drop subscribers
          </h1>
          <p className="mt-2 text-tertiary">
            {active.length} active · {list.length - active.length} unsubscribed
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href="/admin/subscribers/export"
            className="rounded-md bg-secondary-container px-4 py-2 font-headline text-sm font-bold text-on-secondary-container hover:bg-secondary-fixed"
            download
          >
            Export active CSV
          </a>
          <a
            href="/admin/subscribers/export?all=1"
            className="rounded-md bg-surface-container-high px-4 py-2 font-headline text-sm font-bold text-on-surface hover:bg-surface-container-highest"
            download
          >
            Export all CSV
          </a>
        </div>
      </header>

      <NibbleCard bite="none" className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <Th>Email</Th>
              <Th>Source</Th>
              <Th>Subscribed</Th>
              <Th>Unsubscribed</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t border-outline-variant/15">
                <Td>{s.email}</Td>
                <Td>{s.source ?? "—"}</Td>
                <Td>{formatDate(s.subscribedAt, { dateStyle: "medium", timeStyle: "short" })}</Td>
                <Td>{s.unsubscribedAt ? formatDate(s.unsubscribedAt, { dateStyle: "medium" }) : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </NibbleCard>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}
