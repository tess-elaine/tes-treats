import Link from "next/link";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";

export const metadata = { title: "Cookbook" };

export default async function CookbookPage() {
  await requireAdmin();

  const [products, allRecipes] = await Promise.all([
    db.query.products.findMany({
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
      columns: { id: true, name: true },
    }),
    db.query.productRecipes.findMany({
      columns: { id: true, productId: true, name: true, isDefault: true, batchYield: true },
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    }),
  ]);

  const recipesByProduct = new Map<string, typeof allRecipes>();
  for (const r of allRecipes) {
    const list = recipesByProduct.get(r.productId) ?? [];
    list.push(r);
    recipesByProduct.set(r.productId, list);
  }

  return (
    <section>
      <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
        Admin
      </p>
      <h1 className="mt-1 font-headline text-3xl font-extrabold text-primary">
        Cookbook
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant max-w-xl">
        Batch recipes, ingredient quantities, bake instructions, and cost calculations — one place to replace the spreadsheet.
      </p>

      <div className="mt-8 space-y-3">
        {products.map((p) => {
          const recipes = recipesByProduct.get(p.id) ?? [];
          return (
            <NibbleCard key={p.id} bite="none" className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/admin/cookbook/${p.id}`}
                    className="font-headline text-lg font-bold text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {recipes.length === 0 ? (
                      <span className="text-xs text-on-surface-variant/60">No recipes yet</span>
                    ) : (
                      recipes.map((r) => (
                        <span
                          key={r.id}
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            r.isDefault
                              ? "bg-primary/10 text-primary"
                              : "bg-surface-container-high text-on-surface-variant",
                          ].join(" ")}
                        >
                          {r.name}
                          <span className="opacity-60">· {r.batchYield} cookies</span>
                          {r.isDefault && (
                            <span className="ml-0.5 rounded-full bg-primary/20 px-1 text-[10px] font-semibold uppercase tracking-wide">
                              default
                            </span>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <BiteButton
                  href={`/admin/cookbook/${p.id}`}
                  size="md"
                  variant={recipes.length === 0 ? "primary" : "secondary"}
                  biteColor="var(--color-surface-container-lowest)"
                >
                  {recipes.length === 0 ? "Add recipe" : "View recipes"}
                </BiteButton>
              </div>
            </NibbleCard>
          );
        })}
      </div>
    </section>
  );
}
