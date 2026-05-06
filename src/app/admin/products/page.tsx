import Link from "next/link";
import Image from "next/image";
import { BiteButton } from "@/components/ui/bite-button";
import { NibbleCard } from "@/components/ui/nibble-card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { db } from "@/db";
import { formatCents } from "@/lib/format";
import { primaryImagesByProductIds, listCategories } from "@/lib/products";
import { deleteProductAction } from "./actions";

export const metadata = { title: "Admin · Products" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const list = await db.query.products.findMany({
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  });
  const [defaults, categories, images] = await Promise.all([
    Promise.all(
      list.map(async (p) => {
        const v = await db.query.productVariants.findFirst({
          where: (t, { eq }) => eq(t.productId, p.id),
          orderBy: (t, { desc, asc }) => [desc(t.isDefault), asc(t.sortOrder)],
        });
        return [p.id, v ? { label: v.label, priceCents: v.priceCents } : null] as const;
      }),
    ),
    listCategories(),
    primaryImagesByProductIds(list.map((p) => p.id)),
  ]);
  const defaultsMap = new Map(defaults);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
            Catalog
          </p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold text-primary md:text-5xl">
            Products
          </h1>
        </div>
        <BiteButton href="/admin/products/new" size="md">+ New product</BiteButton>
      </header>

      {list.length === 0 ? (
        <NibbleCard bite="none" className="p-10 text-center">
          <p className="text-tertiary">No products yet.</p>
          <div className="mt-6">
            <BiteButton href="/admin/products/new" size="lg">Add your first product</BiteButton>
          </div>
        </NibbleCard>
      ) : (
        <NibbleCard bite="none" className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th>Default</Th>
                <Th>Featured</Th>
                <Th>Available</Th>
                <Th>Public URL</Th>
                <Th><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const v = defaultsMap.get(p.id);
                const img = images.get(p.id);
                const cat = categoryMap.get(p.categoryId);
                return (
                  <tr key={p.id} className="border-t border-outline-variant/15">
                    <Td>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="flex items-center gap-3 font-medium text-primary hover:underline"
                      >
                        {img ? (
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-container">
                            <Image src={img} alt="" fill sizes="40px" className="object-cover" />
                          </span>
                        ) : (
                          <span className="h-10 w-10 shrink-0 rounded-md bg-surface-container" />
                        )}
                        <span>{p.name}</span>
                      </Link>
                    </Td>
                    <Td>{cat?.name ?? "—"}</Td>
                    <Td>{v ? `${v.label} · ${formatCents(v.priceCents)}` : "—"}</Td>
                    <Td>{p.isFeatured ? "Yes" : "No"}</Td>
                    <Td>{p.isAvailable ? "Yes" : "No"}</Td>
                    <Td>
                      <Link
                        href={`/shop/${p.slug}`}
                        className="text-on-surface-variant hover:text-primary"
                      >
                        /shop/{p.slug}
                      </Link>
                    </Td>
                    <Td>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmit
                          message={`Delete "${p.name}" permanently?`}
                          className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant hover:text-error"
                        >
                          Delete
                        </ConfirmSubmit>
                      </form>
                    </Td>
                  </tr>
                );
              })}
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
  return <td className={`px-4 py-3 align-middle ${className ?? ""}`}>{children}</td>;
}
