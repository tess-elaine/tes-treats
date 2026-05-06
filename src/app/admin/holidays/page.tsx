import Link from "next/link";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { db } from "@/db";
import { toggleHolidayHiddenAction, deleteHolidayAction } from "./actions";

export const metadata = { title: "Admin · Holidays" };
export const dynamic = "force-dynamic";

export default async function AdminHolidaysPage() {
  const list = await db.query.holidays.findMany({
    orderBy: (t, { asc }) => [asc(t.date)],
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Calendar
          </p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
            Holidays
          </h1>
          <p className="mt-2 text-tertiary">
            Pin a drop to one when you create it. Hidden holidays still exist
            but don&rsquo;t appear in admin pickers.
          </p>
        </div>
        <BiteButton href="/admin/holidays/new" size="md">+ New holiday</BiteButton>
      </header>

      {list.length === 0 ? (
        <NibbleCard bite="none" className="p-10 text-center">
          <p className="text-tertiary">No holidays yet.</p>
        </NibbleCard>
      ) : (
        <NibbleCard bite="none" className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Date</Th>
                <Th>Name</Th>
                <Th>Recurring</Th>
                <Th>Hidden</Th>
                <Th><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.id} className="border-t border-outline-variant/15">
                  <Td className="font-mono text-sm">{h.date}</Td>
                  <Td>
                    <Link href={`/admin/holidays/${h.id}`} className="font-medium text-primary hover:underline">
                      {h.name}
                    </Link>
                    {h.notes ? (
                      <p className="text-xs text-on-surface-variant">{h.notes}</p>
                    ) : null}
                  </Td>
                  <Td>{h.isRecurring ? "Yes" : "No"}</Td>
                  <Td>{h.isHidden ? "Hidden" : "Visible"}</Td>
                  <Td>
                    <div className="flex gap-3">
                      <form action={toggleHolidayHiddenAction}>
                        <input type="hidden" name="id" value={h.id} />
                        <button
                          type="submit"
                          className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                        >
                          {h.isHidden ? "Show" : "Hide"}
                        </button>
                      </form>
                      <form action={deleteHolidayAction}>
                        <input type="hidden" name="id" value={h.id} />
                        <button
                          type="submit"
                          className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
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
  return <th className="px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
