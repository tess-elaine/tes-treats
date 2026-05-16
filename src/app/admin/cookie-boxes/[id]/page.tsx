import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { db } from "@/db";
import { deleteBoxAction } from "../actions";
import { CookieBoxEditClient } from "./CookieBoxEditClient";

export const dynamic = "force-dynamic";

export default async function AdminCookieBoxDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [box, allProducts] = await Promise.all([
    db.query.cookieBoxes.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      with: {
        items: {
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
          with: { product: true },
        },
        drops: {
          orderBy: (t, { desc }) => [desc(t.opensAt)],
          columns: { id: true, name: true, opensAt: true, isPublished: true },
        },
      },
    }),
    db.query.products.findMany({
      where: (t, { eq }) => eq(t.isAvailable, true),
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
  ]);

  if (!box) notFound();

  const usedProductIds = new Set(box.items.map((i) => i.productId));
  const availableProducts = allProducts
    .filter((p) => !usedProductIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, shortDescription: p.shortDescription }));

  const items = box.items.map((i) => ({
    id: i.id,
    sortOrder: i.sortOrder,
    product: {
      id: i.product.id,
      name: i.product.name,
      shortDescription: i.product.shortDescription,
    },
  }));

  return (
    <div className="space-y-8">
      <Link
        href="/admin/cookie-boxes"
        className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary"
      >
        ← All cookie boxes
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Cookie Box
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
            {box.name}
          </h1>
        </div>
        <form action={deleteBoxAction}>
          <input type="hidden" name="id" value={box.id} />
          <ConfirmSubmit
            message={`Delete "${box.name}" permanently? This cannot be undone if drops are linked.`}
            className="font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
          >
            Delete box
          </ConfirmSubmit>
        </form>
      </header>

      <CookieBoxEditClient
        box={box}
        initialItems={items}
        initialAvailableProducts={availableProducts}
        drops={box.drops}
      />
    </div>
  );
}
